import Image from "next/image";

/**
 * Logo rules: docs/design-system/logos.md.
 * Both logos are served unmodified (`unoptimized`: no server-side resizing or re-encoding).
 */

/** Trimmed copy: only fully transparent canvas removed (DS-05). Artwork 406 × 197. */
const ASHWAMEDH = { src: "/logos/ashwamedh-logo-trimmed.png", width: 406, height: 197 };
const PCE = { src: "/logos/pce-logo.png", width: 506, height: 353 };

/**
 * DS-06 native-sharpness limit: rendered width × DPR ≤ 406 px → ≤ 203 CSS px on 2× screens.
 * Never render the current asset wider than this.
 */
export const ASHWAMEDH_MAX_SHARP_WIDTH = 203;

export function AshwamedhLogo({
  width,
  alt = "ASHWAMEDH 2026",
  eager = false,
  className,
}: {
  width: number;
  alt?: string;
  eager?: boolean;
  className?: string;
}) {
  const w = Math.min(width, ASHWAMEDH_MAX_SHARP_WIDTH);
  const h = Math.round((w * ASHWAMEDH.height) / ASHWAMEDH.width);
  return (
    <Image
      src={ASHWAMEDH.src}
      width={w}
      height={h}
      alt={alt}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      className={className}
      style={{ width: w, height: "auto" }}
    />
  );
}

/** PCE logo — always on the light plate (DS-04); the artwork itself is untouched. */
export function PceLogo({
  height,
  alt = "Priyadarshini College of Engineering, Nagpur",
  className = "",
  eager = false,
}: {
  height: number;
  alt?: string;
  className?: string;
  /** Above-the-fold (navbar hero state): load eagerly — it can be the LCP element on mobile. */
  eager?: boolean;
}) {
  const w = Math.round((height * PCE.width) / PCE.height);
  const pad = Math.max(4, Math.round(w * 0.08));
  return (
    <span
      className={`inline-flex shrink-0 rounded-md bg-plate ${className}`}
      style={{ padding: pad }}
    >
      <Image
        src={PCE.src}
        width={w}
        height={height}
        alt={alt}
        unoptimized
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        style={{ width: w, height }}
      />
    </span>
  );
}
