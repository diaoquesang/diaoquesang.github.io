/**
 * Recolour a logo that ships as a light/white mark so it reads on the white
 * icon plate: keep the alpha channel, replace every RGB value with one flat
 * colour. Pass --write to overwrite the file; without it only reports.
 *
 * Usage: node tools/recolor-icon.mjs <image> <#rrggbb> [--write]
 */
import { createRequire } from "node:module";

/* sharp's ESM entry uses `import ... with { type: 'json' }`, unsupported on
   Node 20.9 — go through the CommonJS entry instead. */
const sharp = createRequire(import.meta.url)("sharp");

const [file, hex, write] = process.argv.slice(2);
if (!file || !hex) { console.log("usage: node tools/recolor-icon.mjs <image> <#rrggbb> [--write]"); process.exit(1); }

const [tr, tg, tb] = hex.replace("#", "").match(/.{2}/g).map((v) => parseInt(v, 16));

const img = sharp(file, { animated: false });
const meta = await img.metadata();
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;

let opaque = 0, white = 0, transparent = 0, sumA = 0;
for (let i = 0; i < data.length; i += ch) {
  const a = data[i + 3];
  sumA += a;
  if (a < 8) { transparent++; continue; }
  opaque++;
  if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) white++;
}
console.log(`${file}: ${info.width}x${info.height} channels=${ch} opaque=${opaque} whiteish=${white} transparent=${transparent} avgAlpha=${Math.round(sumA / (info.width * info.height))}`);

if (write === "--write") {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += ch) {
    out[i] = tr; out[i + 1] = tg; out[i + 2] = tb;   // alpha (i+3) untouched
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toFile(file + ".tmp");
  const fs = await import("node:fs");
  fs.renameSync(file + ".tmp", file);
  console.log(`recoloured to ${hex} -> ${file}`);
}
