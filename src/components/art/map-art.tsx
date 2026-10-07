import { useId } from "react";

/**
 * Abstract map treatment (OD-06): a plan-view dot grid with a few restrained contour rings
 * and a soft centre glow. Deliberately contains NO buildings, pins, labels, legend or
 * geography — nothing that could be read as an official campus layout.
 */
export function MapArt({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      aria-hidden
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full text-accent ${className}`}
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        {/* Dots fade toward the edges so the field reads as a calm, centred surface */}
        <radialGradient id={`${uid}-fade`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.15" />
        </radialGradient>
        <mask id={`${uid}-mask`}>
          <rect width="800" height="400" fill={`url(#${uid}-fade)`} />
        </mask>
        {/* Dot grid: one dot per 24-unit tile (centres x = 12…780, y = 12…396) — one pattern
            instead of 561 <circle> elements. */}
        <pattern id={`${uid}-dots`} patternUnits="userSpaceOnUse" width="24" height="24">
          <circle cx="12" cy="12" r="1.2" fill="#56708c" fillOpacity="0.55" />
        </pattern>
      </defs>
      <rect width="800" height="400" fill={`url(#${uid}-glow)`} />
      <g mask={`url(#${uid}-mask)`}>
        <rect width="800" height="400" fill={`url(#${uid}-dots)`} />
        <g fill="none" stroke="#3a4d63" strokeWidth="1" strokeOpacity="0.8">
          <path d="M400 108 C 520 104 610 160 606 206 C 602 258 508 296 400 292 C 288 288 196 250 198 200 C 200 148 288 112 400 108 Z" />
          <path
            d="M400 70 C 566 64 694 140 688 210 C 682 280 548 334 400 330 C 246 326 112 270 116 198 C 120 126 244 76 400 70 Z"
            strokeOpacity="0.55"
          />
          <path
            d="M400 32 C 610 24 778 120 770 214 C 762 306 588 372 400 368 C 206 364 30 290 34 196 C 38 104 200 40 400 32 Z"
            strokeOpacity="0.3"
          />
        </g>
      </g>
    </svg>
  );
}
