export function LoginBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="wash" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="90" />
        </filter>
      </defs>
      <rect width="1440" height="900" fill="#e31c23" />
      <ellipse cx="80" cy="40" rx="520" ry="420" fill="#c91a20" filter="url(#wash)" />
      <ellipse cx="1380" cy="860" rx="480" ry="380" fill="#c91a20" filter="url(#wash)" />
      <path
        fill="#d01c22"
        filter="url(#wash)"
        d="M-120 640C280 560 520 720 820 640C1120 560 1320 700 1560 620V980H-120Z"
      />
    </svg>
  );
}
