"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: "icon" | "text";
}

export function CopyButton({
  text,
  label,
  className,
  variant = "icon",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "text") {
    return (
      <button
        onClick={handleCopy}
        className={cn(
          "inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors",
          copied
            ? "text-[var(--success-strong)]"
            : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
          className,
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {label ?? (copied ? "Copied!" : "Copy")}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
        copied
          ? "text-[var(--success-strong)]"
          : "text-[var(--text-tertiary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]",
        className,
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
