import "server-only";
import type { ImageType } from "./image-dimensions";
import { IMAGE_LIMITS } from "./upload-policy";

/**
 * Bounded full decode of an uploaded image (Phase 10.4.3), after the structural checks of
 * image-dimensions.ts and the D6 limits have passed. It proves the compressed pixel data decodes,
 * which header parsing alone cannot.
 *
 * Uses sharp (libvips), which Next.js installs for its image optimizer. Limits:
 *   - input pixels capped at D6's 16,000,000 (libvips refuses before decoding more);
 *   - channels ≤ 4, first frame only, no "unlimited" mode (libvips' PNG/SVG safety limits stay on);
 *   - failOn "warning": truncated or corrupt data, including libjpeg/libpng warnings, is refused;
 *   - stats() decodes every pixel sequentially but keeps no output image, so memory stays bounded;
 *   - a timeout stops processing that runs too long.
 * The format, width and height sharp sees must equal what the header parser read.
 *
 * Fails closed: if sharp cannot be loaded, or anything throws, the image is refused.
 */

const DECODE_TIMEOUT_SECONDS = 15;
const SHARP_FORMAT: Record<ImageType, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export type DecodeCheck = { ok: true } | { ok: false; error: string };

const REFUSED = "The image could not be read completely. Please export it again and re-upload.";

type SharpFactory = (typeof import("sharp"))["default"];

let loader: Promise<SharpFactory | null> | undefined;
async function loadSharp(): Promise<SharpFactory | null> {
  loader ??= import("sharp").then(
    (module) => module.default,
    (error: unknown) => {
      console.error(`[cms] image verification unavailable: ${(error as Error).message}`);
      loader = undefined; // try again on the next upload
      return null;
    },
  );
  return loader;
}

export async function verifyImageDecodes(
  bytes: Uint8Array,
  expected: { type: ImageType; width: number; height: number },
): Promise<DecodeCheck> {
  const sharp = await loadSharp();
  if (!sharp) return { ok: false, error: "Image verification is unavailable. Please try later." };
  try {
    const image = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: IMAGE_LIMITS.maxPixels,
      limitInputChannels: 4,
      unlimited: false,
      animated: false,
      sequentialRead: true,
    });
    const meta = await image.metadata();
    if (
      meta.format !== SHARP_FORMAT[expected.type] ||
      meta.width !== expected.width ||
      meta.height !== expected.height ||
      (meta.pages ?? 1) !== 1
    ) {
      return { ok: false, error: REFUSED };
    }
    await image.timeout({ seconds: DECODE_TIMEOUT_SECONDS }).stats();
    return { ok: true };
  } catch (error) {
    // libvips messages describe the file, never secrets; keep them in the server log only.
    console.warn(`[cms] image decode refused: ${(error as Error).message.split("\n")[0]}`);
    return { ok: false, error: REFUSED };
  }
}
