import type { NextConfig } from "next";

// Next.js needs 'unsafe-eval' only in development (React Fast Refresh). In production we
// drop it to tighten the CSP against script-gadget attacks. 'unsafe-inline' is required for
// App Router hydration scripts in the absence of nonce-based CSP (see 11_SECURITY.md for the
// nonce migration path).
const isProd = process.env.NODE_ENV === "production";

const scriptSrc = ["'self'", "'unsafe-inline'"];
if (!isProd) scriptSrc.push("'unsafe-eval'");

const CSP = {
  "default-src": ["'self'"],
  "script-src": scriptSrc,
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://img.youtube.com",
    "https://i.ytimg.com",
  ],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "upgrade-insecure-requests": [],
};

const cspString = Object.entries(CSP)
  .map(([key, values]) => {
    if (values.length === 0) return key;
    return `${key} ${values.join(" ")}`;
  })
  .join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  webpack: (config) => {
    config.output = config.output || {};
    config.output.hashFunction = "xxhash64";
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspString },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
