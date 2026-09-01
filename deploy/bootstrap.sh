#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# grabytclip — Oracle Cloud Always Free bootstrap script
# Target: Ubuntu 22.04 / 24.04 LTS (ARM64 / Ampere A1)
# Run as root (sudo su -) on a fresh instance.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_USER="${APP_USER:-grabytclip}"
APP_DIR="/var/www/grabytclip"
NODE_MAJOR=22
DOMAIN="${DOMAIN:-grabytclip.example.com}"

# ── Colors for output ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# ── Parse arguments ─────────────────────────────────────────────────
GIT_REPO=""
LOCAL_RSYNC=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --git) GIT_REPO="$2"; shift 2 ;;
    --rsync) LOCAL_RSYNC="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    *) err "Usage: $0 [--git <url> | --rsync <src>] [--domain <domain>]"; exit 1 ;;
  esac
done

if [[ -z "$GIT_REPO" && -z "$LOCAL_RSYNC" ]]; then
  err "Provide either --git <url> or --rsync <src>"
  exit 1
fi

# ── 1. System packages ──────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

log "Installing build tools & dependencies..."
apt-get install -y -qq \
  curl wget git build-essential \
  python3 python3-pip python3-venv \
  ffmpeg \
  nftables \
  unzip

# ── 2. Node.js 22 LTS (NodeSource) ──────────────────────────────────
log "Installing Node.js $NODE_MAJOR LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "node $(node --version) | npm $(npm --version)"

# ── 3. pnpm ─────────────────────────────────────────────────────────
log "Installing pnpm..."
npm install -g pnpm@10 --silent 2>/dev/null
log "pnpm $(pnpm --version)"

# ── 4. yt-dlp ───────────────────────────────────────────────────────
log "Installing / upgrading yt-dlp..."
pip3 install --quiet --upgrade yt-dlp
log "yt-dlp $(yt-dlp --version)"

# Verify FFmpeg
log "ffmpeg $(ffmpeg -version 2>&1 | head -1)"

# ── 5. Create app user ──────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
  log "Creating system user: $APP_USER"
  useradd -r -s /usr/sbin/nologin -d "$APP_DIR" -m "$APP_USER"
fi

# ── 6. Deploy the application code ───────────────────────────────────
mkdir -p "$APP_DIR"

if [[ -n "$GIT_REPO" ]]; then
  log "Cloning from $GIT_REPO"
  git clone "$GIT_REPO" "$APP_DIR"
elif [[ -n "$LOCAL_RSYNC" ]]; then
  log "Expecting rsync from $LOCAL_RSYNC"
  warn "Run the rsync command from your local machine:"
  echo "  rsync -avz --delete $LOCAL_RSYNC/ $APP_USER@<server-ip>:$APP_DIR/"
  warn "Then re-run this script (without --rsync) to continue."
  exit 0
fi

cd "$APP_DIR"

# ── 7. Install dependencies & build ──────────────────────────────────
log "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
log "Building production bundle..."
pnpm build

# ── 8. Production .env ───────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  log "Creating .env from template..."
  cat > "$APP_DIR/.env" <<EOF
# ── App ─────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NODE_ENV=production

# ── Download Engine ────────────────────────────────
YTDLP_PATH=
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
DOWNLOAD_TIMEOUT=600
CONVERT_TIMEOUT=1800
MAX_DOWNLOAD_SIZE=1073741824
DOWNLOAD_FRAGMENTS=4
DOWNLOAD_JOB_TTL_MS=1800000

# ── Rate Limiting ───────────────────────────────────
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_MS=60000
EOF
fi

# ── 9. systemd service ───────────────────────────────────────────────
log "Installing systemd service..."
cat > /etc/systemd/system/grabytclip.service <<'SERVICE'
[Unit]
Description=grabytclip — YouTube video & audio downloader
After=network.target

[Service]
Type=exec
User=grabytclip
Group=grabytclip
WorkingDirectory=/var/www/grabytclip
ExecStart=/usr/bin/pnpm start -p 3000
Restart=always
RestartSec=5
TimeoutStopSec=30
EnvironmentFile=/var/www/grabytclip/.env
# Hard memory limit (Oracle ARM free tier: 24GB)
MemoryMax=8G
# Prevent OOM from killing the entire system
OOMScoreAdjust=500

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable grabytclip
systemctl start grabytclip
log "grabytclip service started"

# ── 10. Caddy reverse proxy + HTTPS auto ─────────────────────────────
log "Installing Caddy..."
if ! command -v caddy &>/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi

cat > /etc/caddy/Caddyfile <<CADDY
${DOMAIN} {
    # Rate limiting (nginx-like via Caddy's rate_limit directive)
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 20
            window 1m
        }
    }

    reverse_proxy localhost:3000 {
        # Stream large file downloads without buffering
        flush_interval -1
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Block access to internal files
    @denied {
        path /.env* /node_modules/* /pnpm-lock.yaml /package.json /.git/*
    }
    respond @denied 404

    # Security headers (app already sets these via next.config.ts, but belt-and-suspenders)
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logs
    log {
        output file /var/log/caddy/grabytclip-access.log
    }
}
CADDY

systemctl reload caddy || systemctl start caddy
log "Caddy configured for https://${DOMAIN}"

# ── 11. yt-dlp nightly cron ─────────────────────────────────────────
log "Setting up yt-dlp update cron..."
cat > /etc/cron.d/update-yt-dlp <<CRON
# yt-dlp breaks when YouTube changes. Update nightly and restart the app.
# Random delay (0-59 min) to spread load across instances.
30 4 * * * root sleep \$((RANDOM % 3600)) && pip3 install --quiet --upgrade yt-dlp && systemctl restart grabytclip
CRON
chmod 644 /etc/cron.d/update-yt-dlp

# ── 12. Firewall (nftables) ─────────────────────────────────────────
log "Configuring firewall..."
cat > /etc/nftables.conf <<'NFTABLES'
#!/usr/sbin/nft -f
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        ct state established,related accept
        ct state invalid drop
        iif lo accept
        ip protocol icmp accept
        tcp dport { 22, 80, 443 } accept
        # Rate limit SSH to prevent brute-force
        tcp dport 22 meter ssh-meter { ip saddr limit rate 5/minute } accept
    }
    chain forward { type filter hook forward priority 0; policy drop; }
    chain output { type filter hook output priority 0; policy accept; }
}
NFTABLES
systemctl enable nftables
systemctl restart nftables

# ── 13. Swap file (1GB — safety net for 4K re-encode) ────────────────
if ! swapon --show | grep -q /swapfile; then
  log "Creating 1GB swap file..."
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── 14. Verify ───────────────────────────────────────────────────────
log "Waiting for app to start..."
sleep 5
if curl -fsS "http://localhost:3000/api/health" >/dev/null 2>&1; then
  log "App is running locally on port 3000"
  log "Health check: http://localhost:3000/api/health"
  curl -s "http://localhost:3000/api/health" | head -1
else
  warn "App health check failed — check: journalctl -u grabytclip -n 50 --no-pager"
fi

log "═══════════════════════════════════════════════════"
log "grabytclip deployment complete!"
log ""
log "  URL:    https://${DOMAIN}"
log "  Health: https://${DOMAIN}/api/health"
log ""
log "  Next steps:"
log "  1. Point your domain's A record to this server's IP"
log "  2. Caddy will auto-provision SSL"
log "  3. Verify: curl -fsS https://${DOMAIN}/api/health"
log "  4. Set up Cloudflare Tunnel (optional) instead of public IP"
log ""
log "  Management:"
log "    systemctl status grabytclip"
log "    journalctl -u grabytclip -f"
log "    systemctl restart grabytclip"
log "═══════════════════════════════════════════════════"