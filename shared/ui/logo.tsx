export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#logo-bg)" />
      <ellipse cx="256" cy="220" rx="150" ry="105" fill="#e2e8f0" />
      <ellipse cx="238" cy="180" rx="90" ry="44" fill="white" opacity="0.5" />
      <path d="M110 195 C85 190 62 160 58 140 L110 188 Z" fill="#94a3b8" />
      <path d="M110 245 C85 250 62 280 58 300 L110 252 Z" fill="#94a3b8" />
      <rect x="208" y="362" width="96" height="32" rx="12" fill="#94a3b8" />
      <line x1="230" y1="324" x2="216" y2="362" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
      <line x1="282" y1="324" x2="296" y2="362" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
      <path d="M348 358 Q376 338 364 305" fill="none" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" opacity="0.7" />
      <path d="M370 375 Q405 350 390 308" fill="none" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
