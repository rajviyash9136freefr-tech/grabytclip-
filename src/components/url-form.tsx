"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface UrlFormProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
}

export function UrlForm({ onSubmit, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    await onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Paste YouTube URL here…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="h-12 w-full pl-4 pr-4 text-[15px]"
          autoFocus
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-12 px-6"
        disabled={isLoading || !url.trim()}
      >
        {isLoading ? <Spinner className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        Get Video
      </Button>
    </form>
  );
}
