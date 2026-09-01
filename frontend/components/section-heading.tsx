interface SectionHeadingProps {
  label?: string;
  heading: string;
  sub?: string;
}

/** Shared eyebrow pill + gold-rule heading used by every content section. */
export function SectionHeading({ label, heading, sub }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-col items-center text-center">
      {label && (
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--surface-2)]/80 px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--gold)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {label}
        </span>
      )}
      <h2 className="mt-4 font-display text-[30px] font-black text-[var(--text-primary)] sm:text-[38px]">
        {heading}
      </h2>
      {sub && (
        <p className="mx-auto mt-4 max-w-[560px] text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {sub}
        </p>
      )}
      <Ornament />
    </div>
  );
}

export function Ornament() {
  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-[var(--gold)]/70">
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-[var(--gold)]/60" />
      <span className="text-[14px] leading-none">✦</span>
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-[var(--gold)]/60" />
    </div>
  );
}
