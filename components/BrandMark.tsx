export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-s bg-accent shrink-0"
      style={{ width: size, height: size, padding: Math.round(size * 0.16) }}
    >
      <svg viewBox="0 0 128 128" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="34" width="52" height="62" rx="7" fill="#ffffff" />
        <line x1="40" y1="50" x2="72" y2="50" stroke="#2f6e68" strokeWidth="4" strokeLinecap="round" />
        <line x1="40" y1="60" x2="72" y2="60" stroke="#2f6e68" strokeWidth="4" strokeLinecap="round" />
        <line x1="40" y1="70" x2="62" y2="70" stroke="#2f6e68" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M70 58 h28 a8 8 0 0 1 8 8 v16 a8 8 0 0 1 -8 8 h-16 l-10 10 v-10 h-2 a8 8 0 0 1 -8 -8 v-16 a8 8 0 0 1 8 -8 z"
          fill="#ffffff"
          stroke="#2f6e68"
          strokeWidth="3.5"
        />
        <circle cx="82" cy="76" r="2.8" fill="#2f6e68" />
        <circle cx="91" cy="76" r="2.8" fill="#2f6e68" />
        <circle cx="100" cy="76" r="2.8" fill="#2f6e68" />
      </svg>
    </div>
  );
}
