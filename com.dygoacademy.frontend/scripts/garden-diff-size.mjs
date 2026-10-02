/**
 * Home page HP-2: the viewport for one reference, from its PNG's size.
 * The references are exported at device scale factor 2, so a 780 × 1688
 * PNG is a 390 × 844 board (the A/GR/AU/Q screens) and 2560 × 5200 is the
 * 1280 × 2600 desktop home board. Used by scripts/garden-diff.mjs.
 */
import fs from 'node:fs';

export const DEVICE_SCALE_FACTOR = 2;

/** Width and height of a PNG from its IHDR chunk (bytes 16–23). */
export function pngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('not a PNG');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** The CSS viewport for a PNG of `width` × `height` pixels at `scale`. */
export function viewportForPng({ width, height }, scale = DEVICE_SCALE_FACTOR) {
  if (width % scale !== 0 || height % scale !== 0) {
    throw new Error(`reference ${width}×${height} is not a multiple of ${scale}`);
  }
  return { width: width / scale, height: height / scale };
}

/** The CSS viewport for the reference PNG at `file`. */
export function referenceViewport(file, scale = DEVICE_SCALE_FACTOR) {
  const fd = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    return viewportForPng(pngSize(header), scale);
  } finally {
    fs.closeSync(fd);
  }
}
