// ---------------------------------------------------------------------------
// Shared SEO data + JSON-LD schema helpers for grabytclip.
// Single source of truth so the visible FAQ and the FAQPage schema always match.
// ---------------------------------------------------------------------------

export interface FaqItem {
  q: string;
  a: string;
}

export interface ToolStep {
  title: string;
  desc: string;
}

export interface ToolFeature {
  title: string;
  desc: string;
}

export interface ToolPageConfig {
  slug: string;
  /** <title> — primary keyword first. */
  metadataTitle: string;
  /** <meta name="description"> — aim 150–160 chars. */
  description: string;
  /** H1 for the page. */
  h1: string;
  /** Short lead-in paragraph(s) shown above the downloader. */
  intro: string[];
  steps: ToolStep[];
  features: ToolFeature[];
  faq: FaqItem[];
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://grabytclip.com";
}

const SITE_NAME = "grabytclip";
const SITE_DESC =
  "grabytclip is a free, no-account YouTube downloader and metadata toolkit. " +
  "Download videos in 4K, 2K, 1080p, 720p, 480p or 360p, extract audio as MP3 or M4A, " +
  "grab thumbnails, and copy descriptions and hashtags.";

// ---------------------------------------------------------------------------
// Homepage FAQ — must match the visible <Faq> on the homepage exactly.
// ---------------------------------------------------------------------------

export const homeFaq: FaqItem[] = [
  {
    q: "Is grabytclip free to use?",
    a: "Yes. grabytclip is completely free — no accounts, no subscription, no watermark, " +
      "and no hidden fees. Paste a YouTube link and download.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. There is nothing to sign up for. Copy a YouTube URL, paste it into the box, and " +
      "you get your download links instantly.",
  },
  {
    q: "What video qualities can I download?",
    a: "You can download up to 4K, 2K, 1080p, 720p, 480p or 360p — whichever the source " +
      "video actually provides. grabytclip shows you exactly what's available for each video.",
  },
  {
    q: "Can I extract audio as MP3 or M4A?",
    a: "Yes. Choose M4A for the best quality or MP3 for maximum compatibility. Audio is " +
      "extracted and served directly to you with one click.",
  },
  {
    q: "Can I download YouTube Shorts?",
    a: "Yes. Paste any Shorts URL (youtube.com/shorts/...) and grabytclip treats it like any " +
      "other video — download it as MP4 or extract the audio.",
  },
  {
    q: "Is there a download limit?",
    a: "There is no hard limit. To keep the service fast for everyone we apply light " +
      "rate-limiting to stop abuse, but normal use is unrestricted.",
  },
  {
    q: "Is it safe and private?",
    a: "Yes. Downloads are streamed directly to your device and are never stored on our " +
      "servers. We use HTTPS, set no tracking cookies, and never require your Google " +
      "credentials.",
  },
  {
    q: "Does it work on mobile and desktop?",
    a: "Yes. grabytclip is fully responsive and works in any modern browser — on Windows, " +
      "Mac, Linux, Android and iOS.",
  },
];

// ---------------------------------------------------------------------------
// Tool pages (vidssave-style sub-pages targeting long-tail keywords).
// ---------------------------------------------------------------------------

export const toolPages: Record<string, ToolPageConfig> = {
  "youtube-to-mp4": {
    slug: "youtube-to-mp4",
    metadataTitle: "YouTube to MP4 Downloader — Save Videos in 4K, 1080p, 720p",
    description:
      "Convert YouTube videos to MP4 free: 4K, 2K, 1080p, 720p, 480p or 360p. No account, " +
      "no watermark — paste the link and download in seconds.",
    h1: "YouTube to MP4 Downloader",
    intro: [
      "Download any YouTube video as an MP4 file in the quality you want — up to 4K when the " +
        "source provides it. Paste a link below and grabytclip shows you every available " +
        "resolution with estimated file sizes.",
      "There's no account, no watermark, and no install required. Works for regular videos, " +
        "Shorts, and music uploads.",
    ],
    steps: [
      {
        title: "Copy the video URL",
        desc: "Open the YouTube video you want and copy its link from the address bar.",
      },
      {
        title: "Paste the link",
        desc: "Drop the URL into the box above — grabytclip fetches it instantly.",
      },
      {
        title: "Pick your quality",
        desc: "Choose 4K, 2K, 1080p, 720p or lower, then click Download to save the MP4.",
      },
    ],
    features: [
      { title: "True MP4 output", desc: "Re-muxed MP4 files that play on phones, TVs, and desktops." },
      { title: "Up to 4K", desc: "Get 4K, 2K, 1080p, 720p, 480p and 360p — whatever the source offers." },
      { title: "Size estimates", desc: "See approximate file sizes before you download." },
      { title: "No account", desc: "No sign-up, no watermark, no limits for normal use." },
    ],
    faq: [
      {
        q: "What MP4 qualities are available?",
        a: "Up to 4K (2160p), 2K (1440p), 1080p, 720p, 480p and 360p. The options shown depend " +
          "on the resolution YouTube actually provides for that video.",
      },
      {
        q: "Why would I get a lower resolution than the original?",
        a: "Some videos — especially live streams or very old uploads — are only available in " +
          "lower resolutions. grabytclip always shows the best quality the source offers.",
      },
      {
        q: "Will the MP4 work on my phone or TV?",
        a: "Yes. Downloads are merged into a standard MP4 container (H.264 video when " +
          "available), which plays on almost every device and media player.",
      },
      {
        q: "Is converting YouTube to MP4 free?",
        a: "Yes, it's completely free and requires no account or watermark.",
      },
    ],
  },

  "youtube-to-mp3": {
    slug: "youtube-to-mp3",
    metadataTitle: "YouTube to MP3 Converter — Extract Audio in High Quality",
    description:
      "Convert YouTube videos to MP3 or M4A audio free. High-quality audio extraction with " +
      "no account needed — paste a link and download the audio track in seconds.",
    h1: "YouTube to MP3 Converter",
    intro: [
      "Extract the audio from any YouTube video as an MP3 or M4A file. Whether it's a song, " +
        "a podcast, or a lecture, grabytclip pulls the best available audio track and serves " +
        "it to you directly — no install, no account, no watermark.",
    ],
    steps: [
      {
        title: "Paste a video link",
        desc: "Copy any YouTube URL — songs, podcasts, lectures, anything with audio.",
      },
      {
        title: "Choose MP3 or M4A",
        desc: "Pick M4A for best quality or MP3 for maximum compatibility.",
      },
      {
        title: "Download the audio",
        desc: "Click Download and save the audio file to your device.",
      },
    ],
    features: [
      { title: "MP3 & M4A", desc: "Extract audio as MP3 or M4A with a single click." },
      { title: "Best audio track", desc: "We pull the highest-quality audio source available." },
      { title: "Great for music & podcasts", desc: "Save songs, podcasts, lectures and audio books for offline listening." },
      { title: "Free & no account", desc: "No sign-up, no watermark, no usage limits for normal use." },
    ],
    faq: [
      {
        q: "What's the difference between MP3 and M4A?",
        a: "M4A (AAC) generally offers better quality at the same bitrate and is our " +
          "'best quality' option. MP3 is more widely compatible with older devices and " +
          "car stereos.",
      },
      {
        q: "Can I convert a YouTube playlist or whole album?",
        a: "At the moment grabytclip converts individual videos. Paste one link at a time to " +
          "convert each song you want.",
      },
      {
        q: "Is YouTube to MP3 conversion legal?",
        a: "Laws vary by country. Please only download audio you have the right to use — " +
          "your own uploads, Creative Commons content, or material you have permission to " +
          "save.",
      },
    ],
  },

  "youtube-shorts-downloader": {
    slug: "youtube-shorts-downloader",
    metadataTitle: "YouTube Shorts Downloader — Save Shorts as MP4",
    description:
      "Download YouTube Shorts as MP4 free. Save any Shorts video to your device in the " +
      "quality you want — no account, no watermark, works on mobile and desktop.",
    h1: "YouTube Shorts Downloader",
    intro: [
      "Save YouTube Shorts to your device in MP4 format. Paste any Shorts link and download " +
        "the clip — plus the audio — instantly, whether you're on your phone or desktop.",
    ],
    steps: [
      {
        title: "Copy the Shorts link",
        desc: "Open the Short you want and copy its URL from the address bar.",
      },
      {
        title: "Paste the link",
        desc: "Drop it into the box above — Shorts URLs are supported automatically.",
      },
      {
        title: "Download the Short",
        desc: "Pick your preferred quality and save the MP4 (or extract the audio).",
      },
    ],
    features: [
      { title: "Shorts supported", desc: "Paste youtube.com/shorts/... links directly." },
      { title: "MP4 output", desc: "Download the clip as a standard MP4 file." },
      { title: "Audio extraction", desc: "Grab just the Short's audio as MP3 or M4A." },
      { title: "Mobile-friendly", desc: "Works great from your phone's browser." },
    ],
    faq: [
      {
        q: "Does this work with any Short?",
        a: "Yes — paste any youtube.com/shorts/... URL. grabytclip recognizes Shorts links " +
          "automatically and treats them like any other video.",
      },
      {
        q: "Can I save only the sound of a Short?",
        a: "Yes. After pasting the link, use the audio options to download just the clip's " +
          "sound as MP3 or M4A.",
      },
      {
        q: "Is it free to download Shorts?",
        a: "Yes, completely free with no account required.",
      },
    ],
  },

  "youtube-thumbnail-downloader": {
    slug: "youtube-thumbnail-downloader",
    metadataTitle: "YouTube Thumbnail Downloader — HD Thumbnails Free",
    description:
      "Download YouTube video thumbnails in high resolution free. Get HD thumbnails for any " +
      "video, Short or playlist link — no account needed.",
    h1: "YouTube Thumbnail Downloader",
    intro: [
      "Grab the thumbnail of any YouTube video in the highest available resolution. Perfect " +
        "for creators who want their own cover art back, or for referencing a video's " +
        "thumbnail. Paste a link and download the HD image instantly.",
    ],
    steps: [
      {
        title: "Paste a video link",
        desc: "Copy any YouTube URL (regular videos, Shorts, or music).",
      },
      {
        title: "Load the video",
        desc: "grabytclip fetches the video and its thumbnail in high resolution.",
      },
      {
        title: "Download the thumbnail",
        desc: "Click 'Thumbnail (JPG)' to save the image to your device.",
      },
    ],
    features: [
      { title: "High resolution", desc: "Downloads the best thumbnail size available." },
      { title: "Works for any video", desc: "Regular videos, Shorts, music, and playlists." },
      { title: "JPG format", desc: "Saves as a standard JPG you can use anywhere." },
      { title: "Free & no account", desc: "No sign-up and no watermark." },
    ],
    faq: [
      {
        q: "What resolution is the thumbnail?",
        a: "We serve the highest-quality thumbnail YouTube provides for the video — up to " +
          "1280x720 for most uploads.",
      },
      {
        q: "Can I download a thumbnail from a Short?",
        a: "Yes. Paste the Shorts link and the thumbnail option works exactly the same way.",
      },
      {
        q: "Can I use the thumbnail commercially?",
        a: "Thumbnails belong to their respective creators. Only download and use them if " +
          "you own the video or have permission from the owner.",
      },
    ],
  },
};

export const toolPageList = Object.values(toolPages);

// ---------------------------------------------------------------------------
// JSON-LD schema generators
// ---------------------------------------------------------------------------

export function faqSchema(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function webAppSchema(opts: { name?: string; description?: string; url?: string } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name ?? SITE_NAME,
    description: opts.description ?? SITE_DESC,
    url: opts.url ?? getBaseUrl(),
    applicationCategory: "MultimediaApplication",
    operatingSystem: "All",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Organization", name: SITE_NAME, url: getBaseUrl() },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getBaseUrl(),
    description: SITE_DESC,
    publisher: orgSchema(),
  };
}

export function orgSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getBaseUrl(),
    description: SITE_DESC,
  };
}
