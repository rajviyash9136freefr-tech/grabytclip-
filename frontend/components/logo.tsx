export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="7" fill="url(#lg)" />
      <path d="M9 7.5v9l7.5-4.5L9 7.5Z" fill="var(--on-accent)" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
