import type { CSSProperties } from "react";

/**
 * Hero atmosphere (docs/design-system/components.md → Hero): night sky, ember glow and an
 * abstract geometric skyline in silhouette. It is not a depiction of the PCE campus and
 * contains no people or crowds (D5). Static — no particles or looping motion.
 */
const ember = (pct: number) => `color-mix(in oklab, var(--brand-ember) ${pct}%, transparent)`;
/** Hot core of the flames: ember lifted toward white. */
const emberHot = (pct: number) =>
  `color-mix(in oklab, color-mix(in oklab, var(--brand-ember) 70%, white) ${pct}%, transparent)`;
const emberStrong = (pct: number) =>
  `color-mix(in oklab, var(--brand-ember-strong) ${pct}%, transparent)`;

const sky: CSSProperties = {
  background: "radial-gradient(120% 80% at 50% 0%, #0b1a2e 0%, #050b14 48%, #03060b 100%)",
};

/** Glow behind the skyline (horizon light). */
const horizon: CSSProperties = {
  background: [
    `radial-gradient(60% 50% at 50% 100%, ${ember(50)} 0%, ${emberStrong(20)} 45%, transparent 78%)`,
    `radial-gradient(34% 60% at 6% 100%, ${ember(60)} 0%, transparent 72%)`,
    `radial-gradient(34% 60% at 94% 100%, ${ember(60)} 0%, transparent 72%)`,
  ].join(", "),
};

/** Fire in front of the skyline, concentrated in the lower corners (reference panel 01). */
const fire: CSSProperties = {
  background: [
    `radial-gradient(22% 30% at 2% 100%, ${emberHot(70)} 0%, transparent 70%)`,
    `radial-gradient(22% 30% at 98% 100%, ${emberHot(70)} 0%, transparent 70%)`,
    `radial-gradient(38% 60% at 0% 100%, ${ember(90)} 0%, ${emberStrong(45)} 38%, transparent 75%)`,
    `radial-gradient(38% 60% at 100% 100%, ${ember(90)} 0%, ${emberStrong(45)} 38%, transparent 75%)`,
    `radial-gradient(50% 26% at 50% 100%, ${ember(50)} 0%, transparent 80%)`,
  ].join(", "),
  mixBlendMode: "screen",
};

const vignette: CSSProperties = {
  background:
    "linear-gradient(to bottom, rgb(3 6 11 / 0.55) 0%, transparent 30%), radial-gradient(120% 90% at 50% 70%, transparent 55%, rgb(3 6 11 / 0.6) 100%)",
};

export function HeroBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden text-ember">
      <div className="absolute inset-0" style={sky} />
      <div className="absolute inset-x-0 bottom-0 h-[75%]" style={horizon} />

      <svg
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          {/* Far buildings sit just above the sky's value so their lit windows feel grounded. */}
          <linearGradient id="hero-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1524" />
            <stop offset="100%" stopColor="#05090f" />
          </linearGradient>
        </defs>
        <g fill="#bec6d3">
          {STARS.map(([x, y, r, o]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fillOpacity={o} />
          ))}
        </g>

        {/* Far skyline: varied roofs, faint ember rim light along the roofline */}
        <path d={skylinePath(FAR, 800)} fill="url(#hero-far)" />
        <path
          d={skylinePath(FAR, 800)}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
        <g fill="currentColor" fillOpacity="0.5">
          {windowsFor(FAR).map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="5" height="4" rx="0.5" />
          ))}
        </g>

        {/* Near skyline */}
        <path d={skylinePath(NEAR, 800)} fill="#020409" />
        <path
          d={skylinePath(NEAR, 800)}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="1"
        />

        <g fill="currentColor">
          {EMBERS.map(([x, y, r, o]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fillOpacity={o} />
          ))}
        </g>
      </svg>

      <div className="absolute inset-0" style={vignette} />
      <div className="absolute inset-x-0 bottom-0 h-[70%]" style={fire} />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-base to-transparent" />
    </div>
  );
}

const STARS: [number, number, number, number][] = [
  [80, 60, 1.2, 0.6],
  [210, 130, 0.8, 0.4],
  [340, 50, 1, 0.5],
  [470, 170, 0.8, 0.35],
  [560, 80, 1.3, 0.6],
  [690, 40, 0.9, 0.4],
  [820, 120, 1.1, 0.5],
  [960, 60, 0.8, 0.45],
  [1080, 150, 1.2, 0.5],
  [1190, 70, 0.9, 0.4],
  [1310, 130, 1.1, 0.55],
  [1400, 40, 0.8, 0.35],
  [140, 240, 0.8, 0.3],
  [620, 250, 0.7, 0.3],
  [1250, 260, 0.8, 0.3],
  [900, 230, 0.7, 0.25],
  [380, 300, 0.7, 0.25],
  [1020, 330, 0.6, 0.2],
];

const EMBERS: [number, number, number, number][] = [
  [120, 640, 2, 0.8],
  [190, 590, 1.4, 0.6],
  [260, 690, 1.8, 0.7],
  [1180, 630, 2, 0.7],
  [1250, 570, 1.3, 0.6],
  [1330, 680, 1.8, 0.8],
  [40, 700, 1.4, 0.6],
  [1400, 700, 1.4, 0.6],
  [330, 730, 1.2, 0.5],
  [1110, 740, 1.2, 0.5],
  [70, 560, 1, 0.45],
  [1370, 560, 1, 0.45],
];

/**
 * Abstract skyline (not the PCE campus). Each entry is one building:
 * x, width, roof height (y of the main roofline) and a roof variation.
 * Buildings stay low in the centre so the logo and CTA keep a clear field.
 */
type Roof = "flat" | "step" | "pitch" | "dome" | "antenna" | "tank";
type Building = { x: number; w: number; top: number; roof: Roof };

const FAR: Building[] = [
  { x: 0, w: 64, top: 560, roof: "flat" },
  { x: 64, w: 58, top: 520, roof: "tank" },
  { x: 122, w: 46, top: 548, roof: "pitch" },
  { x: 168, w: 74, top: 500, roof: "step" },
  { x: 242, w: 40, top: 535, roof: "flat" },
  { x: 282, w: 62, top: 470, roof: "antenna" },
  { x: 344, w: 52, top: 515, roof: "dome" },
  { x: 396, w: 70, top: 545, roof: "step" },
  { x: 466, w: 60, top: 596, roof: "pitch" },
  { x: 526, w: 90, top: 618, roof: "flat" },
  { x: 616, w: 70, top: 628, roof: "tank" },
  { x: 686, w: 80, top: 634, roof: "flat" },
  { x: 766, w: 66, top: 626, roof: "pitch" },
  { x: 832, w: 88, top: 616, roof: "flat" },
  { x: 920, w: 60, top: 590, roof: "dome" },
  { x: 980, w: 66, top: 540, roof: "step" },
  { x: 1046, w: 52, top: 512, roof: "tank" },
  { x: 1098, w: 44, top: 548, roof: "flat" },
  { x: 1142, w: 70, top: 482, roof: "antenna" },
  { x: 1212, w: 56, top: 520, roof: "pitch" },
  { x: 1268, w: 68, top: 452, roof: "step" },
  { x: 1336, w: 48, top: 530, roof: "dome" },
  { x: 1384, w: 56, top: 556, roof: "flat" },
];

const NEAR: Building[] = [
  { x: 0, w: 96, top: 650, roof: "step" },
  { x: 96, w: 70, top: 672, roof: "pitch" },
  { x: 166, w: 104, top: 640, roof: "flat" },
  { x: 270, w: 60, top: 662, roof: "tank" },
  { x: 330, w: 110, top: 690, roof: "flat" },
  { x: 440, w: 140, top: 708, roof: "pitch" },
  { x: 580, w: 150, top: 716, roof: "flat" },
  { x: 730, w: 140, top: 712, roof: "step" },
  { x: 870, w: 150, top: 706, roof: "flat" },
  { x: 1020, w: 90, top: 680, roof: "pitch" },
  { x: 1110, w: 80, top: 646, roof: "tank" },
  { x: 1190, w: 84, top: 664, roof: "flat" },
  { x: 1274, w: 72, top: 636, roof: "step" },
  { x: 1346, w: 94, top: 660, roof: "pitch" },
];

/** Outline of one roof, left → right, starting at (x, top). */
function roofSegment({ x, w, top, roof }: Building): string {
  const r = x + w;
  const mid = x + w / 2;
  switch (roof) {
    case "step": {
      const inset = Math.round(w * 0.22);
      return `L${x} ${top + 14} L${x + inset} ${top + 14} L${x + inset} ${top} L${r - inset} ${top} L${r - inset} ${top + 14} L${r} ${top + 14}`;
    }
    case "pitch":
      return `L${x} ${top + 10} L${mid} ${top - 8} L${r} ${top + 10}`;
    case "dome":
      return `L${x} ${top + 6} Q${mid} ${top - 22} ${r} ${top + 6}`;
    case "antenna":
      return `L${x} ${top} L${mid - 1} ${top} L${mid - 1} ${top - 38} L${mid + 1} ${top - 38} L${mid + 1} ${top} L${r} ${top}`;
    case "tank":
      return `L${x} ${top} L${x + 10} ${top} L${x + 10} ${top - 12} L${x + 26} ${top - 12} L${x + 26} ${top} L${r} ${top}`;
    default:
      return `L${x} ${top} L${r} ${top}`;
  }
}

function skylinePath(buildings: Building[], floor: number): string {
  const first = buildings[0];
  const last = buildings[buildings.length - 1];
  if (!first || !last) return "";
  return `M${first.x} ${floor} ${buildings.map(roofSegment).join(" ")} L${last.x + last.w} ${floor} Z`;
}

/** Window lights placed only inside building bodies (deterministic, sparse). */
function windowsFor(buildings: Building[]): [number, number][] {
  const lights: [number, number][] = [];
  buildings.forEach((b, i) => {
    // Keep the centre (behind the CTA) free of lights.
    if (b.x > 440 && b.x < 1000) return;
    const bodyTop = b.top + (b.roof === "step" ? 22 : 16);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < Math.floor((b.w - 12) / 12); col++) {
        if ((i * 7 + row * 5 + col * 3) % 6 !== 0) continue;
        const y = bodyTop + row * 14;
        if (y > 640) continue;
        lights.push([b.x + 8 + col * 12, y]);
      }
    }
  });
  return lights;
}
