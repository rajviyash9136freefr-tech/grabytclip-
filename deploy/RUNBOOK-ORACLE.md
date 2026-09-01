# grabytclip — Oracle Cloud Always Free Deployment Runbook

This is the step-by-step you follow to get **grabytclip** live on an **Oracle Cloud
Always Free** instance. The app is NOT serverless — it needs a persistent Node host with
real CPU/disk/bandwidth, because [`backend/lib/youtube.ts`](../backend/lib/youtube.ts)
spawns `yt-dlp` and `ffmpeg` as subprocesses and streams files from disk.

Everything in `deploy/` is written to be copy-pasted. The parts only humans can do
(sign up, add SSH key, configure DNS) are marked **YOU**.

---

## 1. Create the Oracle Cloud Always Free instance — YOU

1. Go to <https://signup.oraclecloud.com> and create an account.
   - Requires email + payment card for identity verification (the Always Free tier is
     genuinely $0 — the card is never charged while you stay in free-tier limits).
2. In the OCI console, **Compute → Instances → Create instance**.
3. Configuration:
   - **Shape**: Ampere A1 (ARM). Free tier = up to 4 OCPU / 24GB RAM total. Give the
     instance **4 OCPU + 24GB** (the max) — a single instance using the full free
     allocation is the cleanest setup.
   - **Image**: **Ubuntu 24.04** (or 22.04).
   - **Networking / VCN**: create a new VCN + subnets. Let it auto-create.
3. **Add SSH key**: upload or paste a public key. Generate one now if you need to:

   ```bash
   ssh-keygen -t ed25519 -C "grabytclip-deploy" -f ~/.ssh/grabytclip_oracle
   ```

   Then paste the contents of `~/.ssh/grabytclip_oracle.pub` into the instance form.
4. **Memory / boot volume**: default boot volume (~50GB) is fine, but bump it to **100GB**
   if you plan to cache large temp videos. Free tier gives 200GB across block volumes.
5. Click **Create**. Note the **Public IP address** and the **username** (for Ubuntu
   images it's `opc`, not `ubuntu`).

---

## 2. Open required ports in the firewall — YOU

In the OCI console, your VCN's security list / NSG must allow ingress on:

- **22** (SSH) — from your IP or `0.0.0.0/0` if you use key-only auth
- **80** (HTTP)
- **443** (HTTPS)

Add ingress rules for these TCP ports. The instance's own `nftables` (configured by the
bootstrap script) will double-guard.

---

## 3. SSH in and run the bootstrap script — YOU

```bash
# From your local machine
ssh -i ~/.ssh/grabytclip_oracle opc@<PUBLIC_IP>
```

You have two ways to get the code onto the server:

### Option A — Git clone (recommended if you have a GitHub repo)

1. Push this project to a private GitHub repo (or make `W:/grabytclip` the repo root and
   push).
2. On the server, run the bootstrap:

```bash
sudo -iu root
cd ~
curl -fsSL "https://raw.githubusercontent.com/<you>/<repo>/main/deploy/bootstrap.sh" -o bootstrap.sh
chmod +x bootstrap.sh
./bootstrap.sh --git https://github.com/<you>/<repo>.git --domain grabytclip.com
```

### Option B — rsync from your machine (no GitHub needed)

On the server, run the bootstrap in "expect rsync" mode, from your local machine copy the
files over, then finish:

```bash
# SERVER
sudo -iu root
cd ~ && ./bootstrap.sh --rsync /var/www/grabytclip --domain grabytclip.com
# ^ this stops and tells you the exact rsync command to run next

# LOCAL (new terminal, from your machine — replace <PUBLIC_IP>)
cd /w/grabytclip
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude deploy \
  -e "ssh -i ~/.ssh/grabytclip_oracle" ./ opc@<PUBLIC_IP>:/var/www/grabytclip/
```

Then on the server, finish the remaining steps: the rsync path sets up code but the
bootstrap's build/start/proxy steps need re-running:

```bash
# SERVER (after rsync)
cd /var/www/grabytclip
sudo -iu root
./deploy/bootstrap.sh --rsync /var/www/grabytclip --domain grabytclip.com
# This time it detects the code is present; re-run will build, install systemd, Caddy, cron, firewall.
```

The script automatically:
- Installs Node 22, pnpm, python3/pip, ffmpeg, yt-dlp
- Verifies versions
- Creates the `grabytclip` system user
- Installs deps + runs `pnpm build`
- Writes a production `.env`
- Installs a **systemd** service, starts + enables it
- Installs **Caddy**, configures HTTPS reverse proxy
- Sets up a **nightly cron** to update yt-dlp (and restart the app)
- Configures `nftables` firewall + a 1GB swap file

> **Note**: The bootstrap pins `NEXT_PUBLIC_APP_URL` to the `--domain` you pass.

---

## 4. Point your domain at the server — YOU

At your DNS provider, create an **A record**:

```
grabytclip.com   →   <PUBLIC_IP>
```

(And an `A` record for `www.grabytclip.com` if you want it too.) Caddy will auto-provision
Let's Encrypt SSL once DNS resolves; it may take a couple of minutes.

---

## 5. Verify the real end-to-end flow — YOU

```bash
# Health check must report engine: "available"
curl -fsS https://grabytclip.com/api/health
# → {"status":"ok","version":"1.0.0","engine":"available",...}

# Info on a real public video
curl -fsS -X POST https://grabytclip.com/api/video/info \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | head -c 600
```

For a full browser test: open the site, paste a real YouTube URL, pick a quality, click
download. **Confirm the file streams from the server** (check the browser's network tab —
the request should go to `/api/video/download/...` on your domain, and the work should
appear in the server's `journalctl -u grabytclip -f`). The browser must not be doing the
download legwork itself.

---

## 6. Daily operations

```bash
# Status / logs
sudo systemctl status grabytclip
sudo journalctl -u grabytclip -f          # follow live logs

# Restart after a config change
sudo systemctl restart grabytclip

# Manual yt-dlp update
sudo pip3 install --upgrade yt-dlp && sudo systemctl restart grabytclip
```

- The **nightly cron** (`/etc/cron.d/update-yt-dlp`) updates yt-dlp at ~04:30 and restarts
  the app. YouTube changes frequently break yt-dlp, so this is essential.
- **Downloads**: temp files are written under the system `tmpdir` and swept after
  `DOWNLOAD_JOB_TTL_MS` (default 30 min). The in-memory job store resets on process restart.

---

## 7. Free-tier limits that still apply

- **4 OCPU / 24GB** — plenty for this app, but re-encoding 4K/VP9→H.264 is CPU-heavy.
  `DOWNLOAD_FRAGMENTS=4` spreads the DASH download across 4 cores.
- **200GB total block volume** (10GB object storage) — boot volume counts toward this.
- **10TB egress/month** on Free Tier (was 10TB; always check Oracle's current Free Tier
  page for the latest number).
- **No global load balancer** on Free Tier by default. Single instance in one region.
- **Always Free compute is not guaranteed capacity** — occasionally you'll get a
  "out of capacity" error creating a free ARM instance. Retry a few times (or wait and
  retry); it's a known Free Tier quirk.

## 8. Recurring cost

**$0.** Oracle Always Free runs this shape at no charge. Only your domain registration
(~$10–15/yr) is a cost, and it's separate from hosting. If you ever exceed free-tier
limits (e.g. scale up the shape), Oracle charges for that — stay within the limits above.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/api/health` returns `engine: "missing"` | `ffmpeg`/`yt-dlp` not on PATH for the service. Check `which yt-dlp ffmpeg`; the bootstrap installs them globally, but confirm `systemctl restart grabytclip` picked them up. |
| App won't start (`journalctl -u grabytclip`) | Check `.env` — `NEXT_PUBLIC_APP_URL` must be a valid full URL. Missing env vars fail Zod validation loudly. |
| Port 3000 already in use | Run `pnpm build` wasn't the issue — check nothing else binds 3000. Caddy proxies to `localhost:3000`. |
| SSL not provisioning | Caddy needs port 80 and 443 open in BOTH OCI security list AND the instance `nftables`. Re-check the bootstrap firewall or relax it: `nft list ruleset`. |
| yt-dlp broken ("Sign in to confirm") | Run the yt-dlp update cron manually: `sudo pip3 install --upgrade yt-dlp && sudo systemctl restart grabytclip`. |
| Build fails `WasmHash` / Node24 | The local dev machine runs Node24 which Next's vendored webpack dislikes. The server uses Node22 LTS — this does NOT happen there. Build on Node22 or inside the server. |
| Can't create free ARM instance | "Out of capacity" is common. Retry, try a different availability domain, or drop to 2 OCPU. |

---

## Files in `deploy/`

| File | Purpose |
| --- | --- |
| `bootstrap.sh` | One-shot server setup: packages, Node22, yt-dlp, build, systemd, Caddy, cron, firewall, swap. |
| `.env.production` | Reference production env with realistic values. The bootstrap writes a copy to the server's `.env`. |
