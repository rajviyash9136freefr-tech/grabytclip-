"use client";

import { useState } from "react";
import { UrlForm } from "@frontend/components/url-form";
import { VideoCard } from "@frontend/components/video-card";
import { Card } from "@frontend/components/ui/card";
import { Skeleton } from "@frontend/components/ui/skeleton";
import { buildThumbnailUrl } from "@frontend/lib/format";
import type { VideoMetadata } from "@backend/lib/youtube";
import { ShieldAlert } from "lucide-react";

/**
 * Self-contained downloader: URL form + fetch + results display.
 * Reused on the homepage and every tool page. Downloads are handled by
 * VideoCard itself via the job-based API (POST /api/video/download).
 */
export function DownloaderTool() {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setMetadata(null);
    try {
      const res = await fetch("/api/video/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as
        | { data: VideoMetadata }
        | { error: { message: string } };
      if (!res.ok || !("data" in json)) {
        const msg = "error" in json ? json.error.message : "Something went wrong";
        setError(msg);
        return;
      }
      setMetadata(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <UrlForm onSubmit={handleSubmit} isLoading={isLoading} />

      {/* Results / loading / error */}
      <div className="mt-6">
        {isLoading && (
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[280px_1fr]">
              <Skeleton className="aspect-video rounded-md" />
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-20" />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Card className="border-[var(--danger)] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]" />
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Could not load video
                </h3>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{error}</p>
                <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                  Check the link and try again. Some videos are private, region-locked, or
                  require sign-in.
                </p>
              </div>
            </div>
          </Card>
        )}

        {metadata && !isLoading && (
          <VideoCard
            metadata={metadata}
            onThumbnailDownload={() => buildThumbnailUrl(metadata.id)}
          />
        )}
      </div>
    </div>
  );
}
