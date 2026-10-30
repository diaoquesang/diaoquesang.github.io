/**
 * Normalise images/communities/* to real PNGs the browser can always render.
 * Several institutions serve their "favicon.ico" as a PNG or JPEG, and one
 * ships a genuine ICO that sharp refuses to decode — so sniff the bytes,
 * decode ICO payloads by hand, and rewrite everything as <slug>.png.
 *
 * Usage: node tools/normalize-icons.mjs [--max 256]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const sharp = createRequire(import.meta.url)("sharp");
const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "images", "communities");
const maxArg = process.argv.indexOf("--max");
const MAX = maxArg > -1 ? +process.argv[maxArg + 1] : 256;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isPng = (b) => b.subarray(0, 8).equals(PNG);
const isJpeg = (b) => b[0] === 0xff && b[1] === 0xd8;
const isIco = (b) => b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1;

/* Decode the biggest frame of a classic ICO (BMP payload) to RGBA. */
function icoToRgba(buf) {
  const count = buf.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const e = 6 + i * 16;
    const w = buf[e] || 256, h = buf[e + 1] || 256;
    const bitCount = buf.readUInt16LE(e + 6);
    const size = buf.readUInt32LE(e + 8);
    const off = buf.readUInt32LE(e + 12);
    if (!best || w * h > best.w * best.h) best = { w, h, bitCount, size, off };
  }
  const { w, h, off } = best;
  const body = buf.subarray(off);
  if (isPng(body)) return { embedded: body };

  const biSize = body.readUInt32LE(0);
  const biPlanes = body.readUInt16LE(6);
  const biBitCount = body.readUInt16LE(14);
  const biCompression = body.readUInt32LE(16);
  void biPlanes; void biSize;
  const palEntries = biBitCount <= 8 ? body.readUInt32LE(32) || (1 << biBitCount) : 0;
  const px = body.subarray(40 + palEntries * 4);
  const chans = biBitCount <= 8 ? 1 : biBitCount / 8;
  const stride = Math.ceil((w * chans * 8) / 32) * 4;

  const palette = [];
  for (let i = 0; i < palEntries; i++) {
    palette.push([body[40 + i * 4 + 2], body[40 + i * 4 + 1], body[40 + i * 4], body[40 + i * 4 + 3]]);
  }
  /* AND mask: 1 bit per pixel, rows padded to 32 bits; marks transparent pixels */
  const maskStride = Math.ceil(w / 32) * 4;
  const maskOff = px.length - (biBitCount === 32 ? 0 : maskStride * h);

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcRow = (h - 1 - y) * stride;          // BMP rows are bottom-up
    const dstRow = y * w * 4;
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 255;
      if (biBitCount === 32) {
        const i = srcRow + x * 4;
        b = px[i]; g = px[i + 1]; r = px[i + 2]; a = px[i + 3];
      } else if (biBitCount === 24) {
        const i = srcRow + x * 3;
        b = px[i]; g = px[i + 1]; r = px[i + 2];
      } else {
        const idx = chans === 1 ? px[srcRow + x] : px[srcRow + x * 2]; // 8/16-bit indexed
        const p = palette[idx] || [0, 0, 0, 255];
        r = p[0]; g = p[1]; b = p[2];
      }
      if (biBitCount !== 32 && maskOff >= 0) {
        const m = maskOff + (h - 1 - y) * maskStride + (x >> 3);
        if (buf[m] !== undefined && (buf[m] >> (7 - (x % 8))) & 1) a = 0;
      }
      const o = dstRow + x * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
    }
  }
  return { rgba: out, w, h, compression: biCompression };
}

for (const f of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, f);
  if (!fs.statSync(file).isFile() || !/\.(png|ico|jpe?g|gif|svg)$/i.test(f)) continue;
  const slug = f.replace(/\.(png|ico|jpe?g|gif|svg)$/i, "");
  const buf = fs.readFileSync(file);
  let image = null;

  if (isPng(buf)) {
    image = sharp(buf);
  } else if (isJpeg(buf)) {
    image = sharp(buf);
  } else if (isIco(buf)) {
    const { embedded, rgba, w, h } = icoToRgba(buf);
    if (embedded) { console.log(`${f}: ICO wrapping PNG`); image = sharp(embedded); }
    else { console.log(`${f}: ICO BMP frame ${w}x${h}`); image = sharp(rgba, { raw: { width: w, height: h, channels: 4 } }); }
  } else {
    console.log(`${f}: UNKNOWN format ${buf.subarray(0, 8).toString("hex")} - left alone`);
    continue;
  }

  const meta = await image.metadata();
  const scale = Math.min(1, MAX / Math.max(meta.width, meta.height));
  const target = { width: Math.round(meta.width * scale), height: Math.round(meta.height * scale) };
  const png = await image.png().resize(target.width, target.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const out = path.join(dir, `${slug}.png`);
  fs.writeFileSync(out, png);
  if (out !== file) fs.rmSync(file);
  console.log(`  -> ${slug}.png ${target.width}x${target.height} ${png.length}B`);
}
