# grabytclip

A fast, free, no-account **YouTube downloader and metadata toolkit**. Paste a link and grab
the video in your preferred quality, extract audio as MP3/M4A, download the thumbnail, and
copy descriptions & hashtags — all from one clean, dark-first UI.

Built with Next.js 15 (App Router), TypeScript (strict), Tailwind CSS v4, and **yt-dlp** as
the download engine.

## Features

- **Video downloads** — 4K, 2K, 1080p, 720p, 480p, 360p (up to whatever the source provides).
- **Audio extraction** — high-quality M4A or MP3.
- **Thumbnail download** — best available resolution.
- **Copy tools** — video description and hashtags.
- **No accounts** — paste a link and go.
- **Server-side streaming** — files are streamed directly to you and never stored.

## Stack

| Layer           | Choice                                                    |
| --------------- | --------------------------------------------------------- |
| Framework       | Next.js 15 (App Router)                                   |
| Language        | TypeScript (strict)                                       |
| Styling         | Tailwind CSS v4 + design tokens                           |
| Download engine | [yt-dlp](https://github.com/yt-dlp/yt-dlp) (server-side)  |
| Audio transcode | FFmpeg (via yt-dlp)                                       |
| Package manager | pnpm                                                      |
| Hosting         | Any Node host with a persistent process (VPS / Node PaaS) |

> ⚠️ yt-dlp needs a **persistent runtime** — it will not run on pure serverless/FaaS
> platforms (like Vercel functions), because it shells out to a long-lived binary and streams
> large files. Deploy to a small VPS or Docker host instead (see `DEPLOYMENT.md`).

## Quick start (local)

Prerequisites: Node 20+, pnpm 10+, [yt-dlp](https://github.com/yt-dlp/yt-dlp) and
[FFmpeg](https://ffmpeg.org/) installed and on your `PATH`.

```bash
pnpm install
cp .env.example .env      # then adjust if needed
pnpm dev                  # http://localhost:3000
```

Verify the engine is detected:

```bash
curl http://localhost:3000/api/health
# → {"data":{"status":"ok","engine":"available"}}
```

## Environment variables

See `.env.example`. The essential ones:

| Var                                            | Purpose                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `YTDLP_PATH`                                   | Path to the `yt-dlp` binary (defaults to `yt-dlp` on `PATH`)     |
| `DOWNLOAD_TIMEOUT`                             | Per-download timeout in seconds (default `120`)                  |
| `MAX_DOWNLOAD_SIZE`                            | Max streamed file size in bytes (default `1 GiB`)                |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | Per-IP rate limiting                                             |
| `NEXT_PUBLIC_APP_URL`                          | Canonical origin (also read by `sitemap`, `robots`, `opengraph`) |

## API

| Endpoint               | Method | Description                                                       |
| ---------------------- | ------ | ----------------------------------------------------------------- |
| `/api/health`          | GET    | Liveness + engine availability                                    |
| `/api/video/info`      | POST   | `{ url }` → video metadata, available qualities, audio options    |
| `/api/video/download`  | GET    | Stream a video or audio file (`?videoId=&type=&quality=/format=`) |
| `/api/video/thumbnail` | GET    | Download the thumbnail (`?videoId=`); proxied from YouTube        |

All errors use the standard envelope `{ error: { code, message, details? } }`.

## Development commands

```bash
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit (strict)
pnpm test          # Vitest unit tests
pnpm build         # production build
pnpm start         # serve the production build
```

## Security posture

- **No shell execution** — yt-dlp is spawned with an args array (`spawn`), never through a
  shell string, so no command injection.
- **Strict URL validation** — only `youtube.com` / `youtu.be` hosts (SSRF guard); inputs are
  canonicalized to a clean `youtube.com/watch?v=<id>` URL.
- **SSRF-safe thumbnail proxy** — the fetched URL is built from a validated video ID and the
  final host must be on the allowlist.
- **Rate limiting** — per-IP sliding-window on info, download, and thumbnail routes.
- **Error envelope** — server internals never leak to the client; unexpected errors become a
  generic `INTERNAL_ERROR`.
- **CSP + security headers** — applied globally via `next.config.ts`.
- **No secrets in the client** — everything is server-only.

## License / legal

grabytclip is an independent tool and is **not affiliated with, endorsed by, or sponsored by**
YouTube or Google. You are responsible for using downloaded content in compliance with
copyright law and YouTube's Terms of Service. See `src/app/terms`, `src/app/privacy`, and
`src/app/disclaimer`.

---

_Design system, security architecture, and build patterns adapted from the ThumbIntel spec set._
