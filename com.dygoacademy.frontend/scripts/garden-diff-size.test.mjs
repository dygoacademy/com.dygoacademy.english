import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { pngSize, referenceViewport, viewportForPng } from './garden-diff-size.mjs';

/** A PNG header (signature + IHDR) for a `width` × `height` image. */
function pngHeader(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe('garden-diff reference size (HP-2)', () => {
  it('reads width and height from the PNG header', () => {
    expect(pngSize(pngHeader(780, 7600))).toEqual({ width: 780, height: 7600 });
  });

  it('rejects a file that is not a PNG', () => {
    expect(() => pngSize(Buffer.from('not a png at all, just text'))).toThrow('not a PNG');
  });

  it('halves the PNG size at DPR 2: phone screens stay 390 × 844', () => {
    expect(viewportForPng({ width: 780, height: 1688 })).toEqual({ width: 390, height: 844 });
  });

  it('gives the home boards their full size', () => {
    expect(viewportForPng({ width: 780, height: 7600 })).toEqual({ width: 390, height: 3800 });
    expect(viewportForPng({ width: 2560, height: 5200 })).toEqual({ width: 1280, height: 2600 });
  });

  it('rejects a size that is not a multiple of the scale', () => {
    expect(() => viewportForPng({ width: 781, height: 1688 })).toThrow('not a multiple of 2');
  });

  it('reads a reference file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-diff-'));
    const file = path.join(dir, 'H2-home-desktop.png');
    fs.writeFileSync(file, pngHeader(2560, 5200));
    try {
      expect(referenceViewport(file)).toEqual({ width: 1280, height: 2600 });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
