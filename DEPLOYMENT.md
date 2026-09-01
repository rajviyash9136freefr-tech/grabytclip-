# grabytclip — Deployment Guide

grabytclip is a Next.js app with a **persistent-process dependency** (yt-dlp + FFmpeg). This
guide covers shipping it publicly.

## Why not serverless

`/api/video/download` shells out to `yt-dlp`, which downloads and (for video) merges streams
via FFmpeg, then streams the result to the browser. This needs:

- a long-lived Node runtime,
- on-disk access to `yt-dlp` and `ffmpeg` binaries,
- enough CPU/bandwidth to stream large files.

Pure functions (Vercel, Netlify, Cloudflare Workers) won't work well. Use a **small VPS** or
a **Docker host** (Fly.io, Railway, Render, a tiny VM) that supports concurrency and long
request bodies.

## Prerequisites on the host

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y ffmpeg python3 python3-pip
pip install yt-dlp

# verify
yt-dlp --version
ffmpeg -version | head -1
node --version   # 20+
pnpm --version   # 10+
```

## 1. Build the app

```bash
pnpm install
pnpm build
```

## 2. Configure environment

Copy `.env.example` to `.env` on the host and set at minimum:

```env
NEXT_PUBLIC_APP_URL=https://grabytclip.com
YTDLP_PATH=              # leave blank to use yt-dlp from PATH
DOWNLOAD_TIMEOUT=600
MAX_DOWNLOAD_SIZE=1073741824
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_MS=60000
```

## 3. Run it

```bash
pnpm start            # production server, binds :3000 by default
```

Run under a process manager (systemd, PM2, or a Docker container). Example systemd unit:

```ini
[Unit]
Description=grabytclip
After=network.target

[Service]
WorkingDirectory=/var/www/grabytclip
ExecStart=/usr/bin/pnpm start -p 3000
Restart=always
EnvironmentFile=/var/www/grabytclip/.env

[Install]
WantedBy=multi-user.target
```

## 4. Reverse proxy (Caddy or Nginx)

Caddy — HTTPS + proxy by default:

```
grabytclip.com {
    reverse_proxy localhost:3000
}
```

Nginx:

```nginx
server {
    listen 443 ssl;
    server_name grabytclip.com;
    # ssl_certificate ...;
    client_max_body_size 20m;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. Docker

```dockerfile
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg && \
    pip install yt-dlp && \
    npm install -g pnpm@10 && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## 6. Post-deploy checks

```bash
curl -fsS https://grabytclip.com/api/health          # {"status":"ok","engine":"available"}
curl -fsS https://grabytclip.com/sitemap.xml
curl -fsS https://grabytclip.com/robots.txt
```

## 7. Rotating yt-dlp

yt-dlp breaks when YouTube changes. Set a nightly cron to update it:

```bash
# daily 04:00
30 4 * * * pip install --upgrade yt-dlp && systemctl restart grabytclip
```

## Notes

- **Set a hard spend/bw cap** on your host or a proxy to bound egress if that matters to you.
- **Rate limiting** in-app is per-IP (in-memory); for a multi-instance deployment, swap the
  in-memory store for Redis.
- Keep `pnpm-lock.yaml` committed; install with `--frozen-lockfile` in CI.
