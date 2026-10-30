/**
 * Print an ASCII preview of each community icon so the marks can be eyeballed
 * without a screenshot tool: 32 columns, density ramp by luminance, '#' where
 * the pixel is opaque and '.' where the alpha is near zero.
 *
 * Usage: node tools/ascii-preview.mjs [file ...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "images", "communities");

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(dir, f));

const RAMP = " .:-=+*#%@";

for (const file of files) {
  const W = 34, H = 17;
  const { data, info } = await sharp(file).ensureAlpha().resize(W, H, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let out = `\n== ${path.basename(file)}\n`;
  for (let y = 0; y < H; y++) {
    let line = "";
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const a = data[i + 3] / 255;
      if (a < 0.12) { line += " "; continue; }
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const idx = Math.min(RAMP.length - 1, Math.max(1, Math.round((1 - lum) * (RAMP.length - 1))));
      line += RAMP[idx];
    }
    out += "|" + line + "|\n";
  }
  console.log(out);
}
