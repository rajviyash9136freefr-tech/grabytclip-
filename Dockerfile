# Use Debian-based Node 22 slim image
FROM node:22-bookworm-slim AS base

# Install system dependencies (FFmpeg, Python, curl, ca-certificates)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install official standalone yt-dlp binary to /usr/local/bin
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Enable pnpm
RUN npm install -g pnpm@10.34.5

# Create non-root user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 user

WORKDIR /app

# Copy dependency specifications first for Docker layer caching
COPY --chown=user:user package.json pnpm-lock.yaml ./

# Install dependencies as user
USER user
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY --chown=user:user . .

# Build Next.js production bundle
ENV NODE_ENV=production
RUN pnpm build

# Hugging Face Spaces uses port 7860
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"
EXPOSE 7860

# Start production server
CMD ["pnpm", "start", "-p", "7860"]
