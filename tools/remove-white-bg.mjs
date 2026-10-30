/* Remove white background from a logo PNG, with anti-alias halo un-blending.
   Usage: node remove-white-bg.mjs <input.png> <output.png> */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) {
  console.error('usage: node remove-white-bg.mjs <input.png> <output.png>');
  process.exit(1);
}

const src = sharp(inFile);
const { data, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const d = data;
let cleared = 0;
let kept = 0;

for (let i = 0; i < d.length; i += 4) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const m = Math.min(r, g, b);
  const mx = Math.max(r, g, b);

  // white or neutral-light pixels (background & inner gaps) -> fully transparent
  if (m >= 250 || (m >= 235 && mx - m <= 8)) {
    d[i + 3] = 0;
    cleared++;
    continue;
  }

  // ink coverage estimate from darkness, then un-blend the white halo
  const a = Math.min(1, ((255 - m) / 255) * 1.9);
  if (a < 0.04) {
    d[i + 3] = Math.round(a * 255);
    cleared++;
    continue;
  }
  const inv = 1 / a;
  d[i]     = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - a)) * inv)));
  d[i + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - a)) * inv)));
  d[i + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - a)) * inv)));
  d[i + 3] = Math.round(a * 255);
  kept++;
}

await sharp(d, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(outFile);

console.log(`${info.width}x${info.height} | transparent: ${cleared} | ink: ${kept} -> ${outFile}`);
