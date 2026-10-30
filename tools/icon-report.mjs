/**
 * Report what actually landed in images/communities/: format, pixel size and
 * whether the mark is light (needs a dark plate) or dark.
 *
 * Usage: node tools/icon-report.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("sharp");
const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "images", "communities");

for (const f of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, f);
  try {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let opaque = 0, lum = 0;
    for (let i = 0; i < data.length; i += ch) {
      if (data[i + 3] < 8) continue;
      opaque++;
      lum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avgLum = opaque ? Math.round(lum / opaque) : null;
    const size = fs.statSync(file).size;
    console.log(
      `${f.padEnd(14)} ${String(info.width).padStart(4)}x${String(info.height).padStart(4)} ${String(size).padStart(7)}B ` +
      `opaque=${opaque ? ((opaque / (info.width * info.height)) * 100).toFixed(0) + "%" : "-"} ` +
      `avgLum=${avgLum === null ? "fully transparent" : avgLum} ${avgLum !== null && avgLum > 180 ? "<-- LIGHT mark (needs dark plate)" : ""}`,
    );
  } catch (e) {
    console.log(`${f.padEnd(14)} ERROR ${e.message}`);
  }
}
