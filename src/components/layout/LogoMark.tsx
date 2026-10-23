import { useId } from "react";

const ROUTE = "M45 18 C37 12 19 14 19 24 C19 31 26 32 32 32 C38 32 45 33 45 40 C45 50 27 52 19 46";

/** The site mark: an S-shaped route through three nodes (amber, white, teal) with a packet travelling along it. Same artwork as app/icon.svg; the motion is in nav.css (.logo-*). */
export function LogoMark({ size = 28 }: { size?: number }) {
  const bg = useId();
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <defs>
        <linearGradient id={bg} x1="8" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d5ffa" />
          <stop offset="1" stopColor="#3a2eb8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${bg})`} />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="1.5" />
      <path pathLength="100" className="logo-base" d={ROUTE} fill="none" strokeWidth="4.4" strokeLinecap="round" />
      <path pathLength="100" className="logo-comet" d={ROUTE} fill="none" strokeWidth="4.4" strokeLinecap="round" />
      <circle className="logo-ring logo-d1" cx="45" cy="18" r="6" fill="none" stroke="#f0b35a" strokeWidth="1.6" />
      <circle className="logo-ring logo-d2" cx="32" cy="32" r="5.2" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle className="logo-ring logo-d3" cx="19" cy="46" r="6" fill="none" stroke="#5eead4" strokeWidth="1.6" />
      <circle className="logo-node logo-d1" cx="45" cy="18" r="6" fill="#f0b35a" />
      <circle className="logo-node logo-d2" cx="32" cy="32" r="5.2" fill="#fff" />
      <circle className="logo-node logo-d3" cx="19" cy="46" r="6" fill="#5eead4" />
      <circle cx="45" cy="18" r="2" fill="#3a2eb8" />
      <circle cx="32" cy="32" r="1.8" fill="#3a2eb8" />
      <circle cx="19" cy="46" r="2" fill="#3a2eb8" />
    </svg>
  );
}
