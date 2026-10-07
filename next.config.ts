import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Required list in Next.js 16; 75 is the default quality.
    qualities: [75],
    // Only official event images may be optimized (src/lib/media.ts). Logos are served
    // `unoptimized` and never pass through the optimizer.
    localPatterns: [{ pathname: "/images/events/**", search: "" }],
  },
};

export default nextConfig;
