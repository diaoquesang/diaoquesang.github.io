/**
 * Dominant-colour breakdown for the community icons: quantise to 3 bits per
 * channel, ignore near-transparent pixels, and print the top buckets. Tells a
 * red brand block from a black one without needing a screenshot.
 *
 * Usage: node tools/icon-palette.mjs [name ...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("sharp");
const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "images", "communities");
const only = process.argv.slice(2);
const files = (only.length ? only.map((f) => (f.includes(path.sep) ? f : path.join(dir, f))) : fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(dir, f)));

for (const file of files) {
  if (!fs.existsSync(file)) { console.log(`${file}: missing`); continue; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const buckets = new Map();
  let total = 0;
  for (let i = 0; i < data.length; i += ch) {
    if (data[i + 3] < 40) continue;
    total++;
    const key = [(data[i] >> 5) << 5, (data[i + 1] >> 5) << 5, (data[i + 2] >> 5) << 5];
    const k = key.join(",");
    const b = buckets.get(k) || { key, n: 0 };
    b.n++;
    buckets.set(k, b);
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 5)
    .map((b) => `rgb(${b.key.join(",")}) ${((b.n / total) * 100).toFixed(0)}%`);
  console.log(`${path.basename(file).padEnd(14)} ${info.width}x${info.height} opaque=${total}  ${top.join(" | ")}`);
}
