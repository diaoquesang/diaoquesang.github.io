// Read-only: average colour of one or more images given as local paths or URLs.
// Used to check whether a logo is a light mark (needs a dark plate) or dark.
import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";

const targets = process.argv.slice(2);

function unfilter(raw, w, h, chans) {
  const stride = w * chans;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= chans ? out[y * stride + x - chans] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= chans && y > 0 ? out[(y - 1) * stride + x - chans] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return out;
}

async function analyse(src) {
  let buf;
  if (/^https?:/i.test(src)) {
    buf = Buffer.from(await (await fetch(src, { headers: { "User-Agent": "Mozilla/5.0" } })).arrayBuffer());
  } else {
    buf = readFileSync(src);
  }
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") { console.log(src, "-> not PNG"); return; }
  let off = 8; const idat = [];
  let w = 0, h = 0, bitDepth = 8, colorType = 0;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  const chans = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : 4;
  if (bitDepth !== 8) { console.log(src, `${w}x${h} bitDepth=${bitDepth} (skip)`); return; }
  const out = unfilter(inflateSync(Buffer.concat(idat)), w, h, chans);
  let n = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < out.length; i += chans) {
    if (chans >= 4 && out[i + 3] < 32) continue;
    n++; r += out[i]; g += out[i + 1]; b += out[i + 2];
  }
  const avg = n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null;
  const hex = avg ? "#" + avg.map(v => v.toString(16).padStart(2, "0")).join("") : "n/a";
  console.log(`${src}\n  ${w}x${h} colorType=${colorType} px=${n} avgRGB=${JSON.stringify(avg)} hex=${hex} lum=${avg ? Math.round(0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2]) : "n/a"}`);
}

for (const t of targets) { try { await analyse(t); } catch (e) { console.log(t, "ERR", e.message); } }
