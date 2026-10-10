import type { NextConfig } from "next";
import { storageImagePatterns } from "./src/lib/storage-images";

const nextConfig: NextConfig = {
  images: {
    // Required list in Next.js 16; 75 is the default quality.
    qualities: [75],
    // Only official event images may be optimized (src/lib/media.ts). Logos are served
    // `unoptimized` and never pass through the optimizer.
    localPatterns: [{ pathname: "/images/events/**", search: "" }],
    // Uploaded event images (Phase 10.4, D8): the project's own Storage host and public
    // event-image folder only, without query strings. Empty when SUPABASE_URL is not set.
    remotePatterns: storageImagePatterns(process.env.SUPABASE_URL),
    // Storage serves the object itself; never follow a redirect to another location.
    maximumRedirects: 0,
    // Uploaded images are at most 5 MB (ashwamedh-images bucket limit).
    maximumResponseBody: 5 * 1024 * 1024,
  },
};

export default nextConfig;
