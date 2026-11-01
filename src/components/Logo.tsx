/**
 * The Leash mark: a collar D-ring whose lead drops and turns into the "L",
 * ending in a clasp. The ring is the owner's rule; the line is the agent's reach.
 */
export function Mark({ size = 28, ring = "var(--color-lime)", line = "currentColor", className = "" }: { size?: number; ring?: string; line?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <path d="M13 22a11 11 0 0 1 22 0v3a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" stroke={ring} strokeWidth="5.5" strokeLinejoin="round" />
      <path d="M24 28v15c0 6 3.5 9 9.5 9H43" stroke={line} strokeWidth="5.5" strokeLinecap="round" />
      <rect x="44" y="46.5" width="11" height="11" rx="3.2" fill={ring} />
      <circle cx="49.5" cy="52" r="2" fill="#0b0e14" />
    </svg>
  );
}
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <Mark size={size} />
      <span className="font-serif leading-none tracking-tight" style={{ fontSize: size * 0.95 }}>leash</span>
    </span>
  );
}
