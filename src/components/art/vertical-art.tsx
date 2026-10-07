import { useId } from "react";
import type { Vertical } from "@/types/festival";

/**
 * Abstract per-vertical artwork (D5, docs/design-system/verticals.md).
 * No people, crowds, robots, stages or venues — motif + accent only. Decorative.
 * `variant` picks one of several focal motifs and offsets it, so grids of placeholders
 * vary while keeping one visual language per vertical.
 */
export function VerticalArt({
  vertical,
  variant = 0,
  className = "",
}: {
  vertical: Vertical;
  variant?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const shift = (variant % 6) * 37;
  const flip = variant % 2 === 1;
  // Move and scale the focal motif per variant so a grid of placeholders doesn't repeat.
  const dx = ((variant * 53) % 140) - 70;
  const dy = ((variant * 31) % 70) - 35;
  const scale = 0.82 + (variant % 4) * 0.1;
  const motif = `translate(${200 + dx} ${150 + dy}) scale(${scale}) translate(-200 -150)`;
  const props = { uid, shift, variant };

  return (
    <svg
      aria-hidden
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full text-accent ${className}`}
    >
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#03060b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="400" height="300" fill="#060c15" />
      <rect width="400" height="300" fill={`url(#${uid}-glow)`} />
      <g transform={`${flip ? "translate(400 0) scale(-1 1) " : ""}${motif}`}>
        {vertical === "technomedh" && <Circuit {...props} />}
        {vertical === "cultural" && <Brush {...props} />}
        {vertical === "sports" && <Streaks {...props} />}
        {vertical === "cultural-night" && <Beams {...props} />}
      </g>
    </svg>
  );
}

type MotifProps = { uid: string; shift: number; variant: number };

/* ---------- Technomedh: circuit board ---------- */

const TRACES = [
  "M-200 80 H90 L120 110 H200",
  "M-200 200 H60 L90 170 H160 L180 150",
  "M600 60 H300 L270 90 H220",
  "M600 230 H320 L290 200 H240 L220 180",
  "M200 -150 V40 L230 70 V100",
  "M150 450 V250 L180 220 V190",
  "M-200 140 H40 L70 120 H140",
  "M600 150 H340 L310 130 H260",
];

function Circuit({ uid, shift, variant }: MotifProps) {
  // A different subset of traces per variant.
  const traces = TRACES.filter((_, i) => (i + variant) % 4 !== 0);
  const kind = variant % 4;

  return (
    <g transform={`translate(${(shift % 40) - 20} 0)`}>
      {/* Background grid: lines every 20 units (x = -200…600, y = -150…450) drawn by one
          pattern tile instead of 72 <line> elements. The tile is offset so its lines land on
          the same coordinates; both lines are kept so crossings stay slightly brighter. */}
      <defs>
        <pattern
          id={`${uid}-grid`}
          patternUnits="userSpaceOnUse"
          x="-10"
          y="0"
          width="20"
          height="20"
        >
          <g stroke="currentColor" strokeOpacity="0.06" strokeWidth="1">
            <line x1="10" y1="0" x2="10" y2="20" />
            <line x1="0" y1="10" x2="20" y2="10" />
          </g>
        </pattern>
      </defs>
      <rect x="-200.5" y="-150.5" width="801" height="601" fill={`url(#${uid}-grid)`} />
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55">
        {traces.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="currentColor">
        {[
          [200, 110],
          [180, 150],
          [220, 90],
          [220, 180],
          [230, 100],
          [180, 190],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
        ))}
      </g>
      <g transform="translate(200 145)">
        {kind === 0 && <Chip uid={uid} />}
        {kind === 1 && <NodeRings uid={uid} />}
        {kind === 2 && <Waveform uid={uid} />}
        {kind === 3 && <Lattice uid={uid} />}
      </g>
    </g>
  );
}

function Chip({ uid }: { uid: string }) {
  return (
    <>
      <rect
        x="-34"
        y="-34"
        width="68"
        height="68"
        rx="8"
        fill="#08121d"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="-34"
        y="-34"
        width="68"
        height="68"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeOpacity="0.25"
        filter={`url(#${uid}-blur)`}
      />
      <rect
        x="-16"
        y="-16"
        width="32"
        height="32"
        rx="4"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
      />
      {[-24, -8, 8, 24].map((p) => (
        <g key={p} stroke="currentColor" strokeWidth="2" strokeOpacity="0.8">
          <line x1={p} y1="-34" x2={p} y2="-44" />
          <line x1={p} y1="34" x2={p} y2="44" />
          <line x1="-34" y1={p} x2="-44" y2={p} />
          <line x1="34" y1={p} x2="44" y2={p} />
        </g>
      ))}
    </>
  );
}

function NodeRings({ uid }: { uid: string }) {
  return (
    <>
      <circle r="48" fill="currentColor" fillOpacity="0.12" filter={`url(#${uid}-blur)`} />
      {[46, 32, 18].map((r, i) => (
        <circle
          key={r}
          r={r}
          fill={i === 2 ? "#08121d" : "none"}
          stroke="currentColor"
          strokeWidth={i === 0 ? 1 : 1.5}
          strokeOpacity={0.4 + i * 0.25}
          strokeDasharray={i === 0 ? "3 5" : undefined}
        />
      ))}
      <circle r="6" fill="currentColor" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={Math.cos((a * Math.PI) / 180) * 32}
          cy={Math.sin((a * Math.PI) / 180) * 32}
          r="3.5"
          fill="currentColor"
        />
      ))}
    </>
  );
}

function Waveform({ uid }: { uid: string }) {
  const points = Array.from({ length: 41 }, (_, i) => {
    const x = -50 + i * 2.5;
    const y = Math.sin(i / 3) * 14 * Math.exp(-Math.abs(i - 20) / 14);
    return `${x},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <>
      <rect
        x="-58"
        y="-36"
        width="116"
        height="72"
        rx="8"
        fill="#08121d"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="-58"
        y="-36"
        width="116"
        height="72"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeOpacity="0.22"
        filter={`url(#${uid}-blur)`}
      />
      <g stroke="currentColor" strokeOpacity="0.15">
        <line x1="-50" y1="0" x2="50" y2="0" />
        <line x1="0" y1="-28" x2="0" y2="28" />
      </g>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  );
}

function Lattice({ uid }: { uid: string }) {
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    }).join(" ");
  return (
    <>
      <polygon
        points={hex(46)}
        fill="currentColor"
        fillOpacity="0.1"
        filter={`url(#${uid}-blur)`}
      />
      <polygon points={hex(42)} fill="#08121d" stroke="currentColor" strokeWidth="2" />
      <polygon points={hex(24)} fill="none" stroke="currentColor" strokeOpacity="0.6" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return (
          <g key={i}>
            <line
              x1="0"
              y1="0"
              x2={Math.cos(a) * 24}
              y2={Math.sin(a) * 24}
              stroke="currentColor"
              strokeOpacity="0.45"
            />
            <circle cx={Math.cos(a) * 24} cy={Math.sin(a) * 24} r="3" fill="currentColor" />
          </g>
        );
      })}
      <circle r="5" fill="currentColor" />
    </>
  );
}

/* ---------- Cultural: brush, ink and pattern ---------- */

function Brush({ uid, shift, variant }: MotifProps) {
  const kind = variant % 3;
  return (
    <g transform={`translate(0 ${(shift % 30) - 15})`}>
      {/* Soft wash kept light so the gold reads bright, not muddy */}
      <g filter={`url(#${uid}-blur)`} fill="currentColor">
        <ellipse cx="140" cy="120" rx="90" ry="50" fillOpacity="0.1" />
        <ellipse cx="270" cy="190" rx="110" ry="45" fillOpacity="0.08" />
      </g>

      {kind === 0 && (
        <g fill="none" strokeLinecap="round">
          <path
            d="M30 210 C 110 120, 190 260, 280 150 S 380 90, 400 120"
            stroke={`url(#${uid}-fade)`}
            strokeWidth="22"
            strokeOpacity="0.75"
          />
          <path
            d="M30 210 C 110 120, 190 260, 280 150 S 380 90, 400 120"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M0 140 C 80 80, 160 170, 230 100 S 330 40, 400 70"
            stroke={`url(#${uid}-fade)`}
            strokeWidth="9"
            strokeOpacity="0.85"
          />
          <path
            d="M60 260 C 140 220, 220 280, 330 220"
            stroke="currentColor"
            strokeWidth="4"
            strokeOpacity="0.55"
          />
        </g>
      )}

      {kind === 1 && (
        <g fill="none" stroke="currentColor">
          {[70, 52, 34].map((r, i) => (
            <circle
              key={r}
              cx="200"
              cy="150"
              r={r}
              strokeWidth={i === 2 ? 2 : 1.5}
              strokeOpacity={0.4 + i * 0.2}
              strokeDasharray={i === 0 ? "2 7" : i === 1 ? "14 6" : undefined}
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (Math.PI / 4) * i;
            const x = 200 + Math.cos(a) * 52;
            const y = 150 + Math.sin(a) * 52;
            return (
              <path
                key={i}
                d={`M200 150 Q ${200 + Math.cos(a + 0.4) * 30} ${150 + Math.sin(a + 0.4) * 30} ${x} ${y}`}
                strokeWidth="2"
                strokeOpacity="0.85"
                strokeLinecap="round"
              />
            );
          })}
          <circle cx="200" cy="150" r="8" fill="currentColor" stroke="none" />
        </g>
      )}

      {kind === 2 && (
        <g>
          <path
            d="M40 230 C 120 60, 260 60, 360 200"
            fill="none"
            stroke={`url(#${uid}-fade)`}
            strokeWidth="30"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          <path
            d="M40 230 C 120 60, 260 60, 360 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g fill="currentColor">
            {[
              [120, 80, 5],
              [150, 60, 3],
              [290, 70, 4],
              [320, 100, 2.5],
              [210, 40, 3],
              [90, 120, 2.5],
            ].map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
        </g>
      )}

      <g fill="currentColor">
        {[
          [88, 92, 3],
          [312, 120, 2.5],
          [250, 250, 2],
          [180, 70, 2],
          [350, 210, 3],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fillOpacity="0.9" />
        ))}
      </g>
    </g>
  );
}

/* ---------- Sports: motion ---------- */

function Streaks({ uid, shift, variant }: MotifProps) {
  const kind = variant % 3;
  const streaks = Array.from({ length: 14 }, (_, i) => {
    const y = 20 + i * 22 + (shift % 11);
    const len = 80 + ((i * 53 + shift) % 160);
    const x = (i * 97 + shift) % 300;
    return { x, y, len, o: 0.15 + ((i * 7) % 10) / 22 };
  });
  return (
    <g>
      <g transform="rotate(-24 200 150)" stroke="currentColor" strokeLinecap="round">
        {streaks.map((s, i) => (
          <line
            key={i}
            x1={s.x}
            y1={s.y}
            x2={s.x + s.len}
            y2={s.y}
            strokeWidth={i % 3 === 0 ? 3 : 1.5}
            strokeOpacity={s.o * (kind === 2 ? 0.5 : 1)}
          />
        ))}
      </g>

      {kind === 0 && (
        <>
          <g fill="none" stroke="currentColor" strokeOpacity="0.25">
            <ellipse cx="200" cy="330" rx="260" ry="110" />
            <ellipse cx="200" cy="330" rx="220" ry="85" />
            <ellipse cx="200" cy="330" rx="180" ry="60" />
          </g>
          <path
            d="M40 240 Q 200 20 360 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="1 9"
            strokeLinecap="round"
            strokeOpacity="0.9"
          />
          <circle cx="360" cy="120" r="10" fill="currentColor" />
          <circle
            cx="360"
            cy="120"
            r="22"
            fill="currentColor"
            fillOpacity="0.3"
            filter={`url(#${uid}-blur)`}
          />
        </>
      )}

      {kind === 1 && (
        <g fill="none" stroke="currentColor">
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M-100 ${190 + i * 26} C 100 ${170 + i * 26}, 300 ${120 + i * 18}, 520 ${100 + i * 14}`}
              strokeOpacity={0.25 + i * 0.1}
              strokeWidth="1.5"
            />
          ))}
          <line
            x1="300"
            y1="80"
            x2="330"
            y2="250"
            strokeWidth="3"
            strokeOpacity="0.9"
            strokeDasharray="6 6"
          />
          <circle cx="250" cy="170" r="9" fill="currentColor" stroke="none" />
          <circle
            cx="250"
            cy="170"
            r="20"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="none"
            filter={`url(#${uid}-blur)`}
          />
        </g>
      )}

      {kind === 2 && (
        <g stroke="currentColor" strokeLinecap="round">
          {Array.from({ length: 16 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 16;
            const r1 = 26 + (i % 3) * 6;
            const r2 = 70 + ((i * 17) % 40);
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * r1}
                y1={150 + Math.sin(a) * r1}
                x2={200 + Math.cos(a) * r2}
                y2={150 + Math.sin(a) * r2}
                strokeWidth={i % 2 ? 1.5 : 3}
                strokeOpacity={i % 2 ? 0.45 : 0.85}
              />
            );
          })}
          <circle cx="200" cy="150" r="12" fill="currentColor" stroke="none" />
          <circle
            cx="200"
            cy="150"
            r="30"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="none"
            filter={`url(#${uid}-blur)`}
          />
        </g>
      )}
    </g>
  );
}

/* ---------- Cultural Night: stage light ---------- */

function Beams({ uid, shift }: MotifProps) {
  const beams = [
    { x: 60 + (shift % 20), spread: 70, o: 0.45 },
    { x: 160, spread: 50, o: 0.62 },
    { x: 250 - (shift % 20), spread: 60, o: 0.54 },
    { x: 340, spread: 80, o: 0.4 },
  ];
  return (
    <g>
      {beams.map((b) => (
        <polygon
          key={b.x}
          points={`${b.x - 6},-150 ${b.x + 6},-150 ${b.x + b.spread},300 ${b.x - b.spread},300`}
          fill={`url(#${uid}-fade)`}
          fillOpacity={b.o}
        />
      ))}
      <g filter={`url(#${uid}-blur)`} fill="currentColor">
        {[
          [70, 230, 14],
          [130, 260, 10],
          [210, 240, 18],
          [290, 265, 12],
          [350, 235, 9],
          [40, 270, 8],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fillOpacity="0.45" />
        ))}
      </g>
      <rect x="-200" y="250" width="800" height="200" fill="#03060b" fillOpacity="0.6" />
      <line x1="-200" y1="250" x2="600" y2="250" stroke="currentColor" strokeOpacity="0.5" />
    </g>
  );
}
