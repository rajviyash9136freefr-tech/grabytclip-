# Deploying grabytclip to Hugging Face Spaces (100% Free Docker Tier)

Hugging Face Spaces provides **2 vCPUs, 16 GB RAM, and 50 GB storage** completely for **free ($0 / ₹0)**. This is ideal for running `yt-dlp` + `ffmpeg` with Next.js.

---

## Step 1: Create a Hugging Face Account & Space

1. Go to [huggingface.co/join](https://huggingface.co/join) and create a free account.
2. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
3. Fill in the Space details:
   - **Space name**: `grabytclip` (or your choice)
   - **License**: `mit` (or choose yours)
   - **Select the Space SDK**: Choose **Docker** 🐳
   - **Docker template**: Choose **Blank**
   - **Space Hardware**: Choose **CPU basic • 2 vCPU • 16 GB • Free**
   - **Visibility**: **Public**
4. Click **Create Space**.

---

## Step 2: Push your Code to the Hugging Face Space

You can push your code to Hugging Face using Git:

### Option A: Using Git CLI

1. Generate an Access Token in Hugging Face:
   - Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Click **Create new token** -> Select **Write** permission -> Copy the token.

2. In your local terminal, add the Hugging Face Space as a remote:
   ```bash
   git remote add hf https://huggingface.co/spaces/<YOUR_USERNAME>/<YOUR_SPACE_NAME>
   ```

3. Push your project to Hugging Face:
   ```bash
   git push hf main
   ```
   *(When prompted for password, paste your Hugging Face Access Token)*

### Option B: Upload via GitHub Sync

1. In your Hugging Face Space, go to **Settings** -> **GitHub Repository Sync**.
2. Connect your GitHub repository to auto-deploy whenever you push to GitHub.

---

## Step 3: Configure Environment Variables (Optional)

In your Hugging Face Space:
1. Go to **Settings** -> **Variables and secrets**.
2. Click **New variable** and add:
   - `NEXT_PUBLIC_APP_URL`: `https://<YOUR_USERNAME>-<YOUR_SPACE_NAME>.hf.space` (or your custom domain)
   - `NODE_ENV`: `production`

---

## Step 4: Connecting Your Custom Domain (Free via Cloudflare)

Hugging Face gives you a direct URL: `https://<username>-<space-name>.hf.space`.

To connect your own custom domain (e.g. `yourdomain.com`):

1. **In Cloudflare DNS**:
   - Add a `CNAME` record:
     - **Name**: `@` (or `www` / `subdomain`)
     - **Target**: `<username>-<space-name>.hf.space`
     - **Proxy status**: Proxied (Orange Cloud ☁️)

2. **Embedding / Full-Screen Custom Domain**:
   - Hugging Face Spaces can be embedded cleanly or proxied directly through Cloudflare Workers / CNAME to give users your branded domain experience.
