export function OwlMark({ className = "h-28 w-28" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" className={className} aria-hidden="true">
      <rect x="18" y="86" width="28" height="22" rx="3" fill="#C9A36A" />
      <rect x="22" y="78" width="20" height="16" rx="2" fill="#E0B322" />
      <rect x="26" y="70" width="12" height="12" rx="2" fill="#C9A36A" />
      <ellipse cx="84" cy="78" rx="46" ry="42" fill="#F0C94A" />
      <ellipse cx="68" cy="70" rx="16" ry="18" fill="#FFF8DC" />
      <ellipse cx="100" cy="70" rx="16" ry="18" fill="#FFF8DC" />
      <circle cx="68" cy="72" r="7" fill="#2A1810" />
      <circle cx="100" cy="72" r="7" fill="#2A1810" />
      <circle cx="70" cy="70" r="2" fill="#FFFDF9" />
      <circle cx="102" cy="70" r="2" fill="#FFFDF9" />
      <path d="M78 82 L84 92 L90 82 Z" fill="#E31C23" />
      <path d="M54 48 Q68 28 84 36 Q100 28 114 48" fill="#F3C84A" stroke="#E0B322" />
      <rect x="118" y="54" width="34" height="28" rx="4" fill="#D9D3C8" />
      <rect x="124" y="60" width="22" height="14" rx="2" fill="#4A90D9" />
      <rect x="128" y="48" width="18" height="10" rx="2" fill="#E31C23" />
      <rect x="132" y="38" width="10" height="14" rx="1" fill="#FFFDF9" />
    </svg>
  );
}
