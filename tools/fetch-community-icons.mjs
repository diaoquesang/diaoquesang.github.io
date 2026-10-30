/**
 * Download the community favicons/logos into images/communities/ so the site
 * serves them locally instead of hot-linking Google's favicon service.
 *
 * For each domain: read the homepage <head> for rel="icon" links (prefer the
 * largest PNG), fall back to /favicon.ico, then to Google s2.
 *
 * Usage: node tools/fetch-community-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "images", "communities");
fs.mkdirSync(outDir, { recursive: true });

const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };

const sites = [
  { slug: "ieee", name: "IEEE", domain: "www.ieee.org" },
  { slug: "aaai", name: "AAAI", domain: "aaai.org" },
  { slug: "miccai", name: "MICCAI", domain: "miccai.org" },
  { slug: "caai", name: "CAAI", domain: "www.caai.cn" },
  { slug: "csig", name: "CSIG", domain: "www.csig.org.cn" },
  { slug: "zcfcia", name: "ZCF", domain: "zcfcia.org.cn" },
];

async function get(url) {
  const res = await fetch(url, { redirect: "follow", headers: UA, signal: AbortSignal.timeout(20000) });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get("content-type") || "", buf };
}

/* PNG header size + palette-aware average colour, so we can tell a light mark
   (needs a dark plate) from a dark one. */
function pngInfo(buf) {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  let off = 8; let w = 0, h = 0, ct = 0, bd = 0; const plte = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === "PLTE") for (let i = 0; i + 2 < data.length; i += 3) plte.push([data[i], data[i + 1], data[i + 2]]);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  return { w, h, colorType: ct, bitDepth: bd, palette: plte };
}

function report(url, buf) {
  const png = pngInfo(buf);
  const kind = png ? `png ${png.w}x${png.h} ct=${png.colorType} bd=${png.bitDepth}` : `${buf.subarray(0, 4).toString("hex")} (not png)`;
  return `${buf.length}B ${kind}`;
}

for (const s of sites) {
  const results = [];
  let chosen = null;
  try {
    const page = await get(`https://${s.domain}/`);
    const html = page.buf.toString("latin1");
    const links = [...html.matchAll(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*>/gi)]
      .map((m) => ({
        href: (m[0].match(/href="([^"]+)"/) || [])[1],
        sizes: (m[0].match(/sizes="([^"]+)"/) || [])[1] || "",
      }))
      .filter((l) => l.href);
    results.push(`homepage ${page.status}; icons: ${links.map((l) => `${l.href} [${l.sizes}]`).join(" | ") || "none"}`);

    // prefer the largest declared PNG, then any png, then anything else
    const score = (l) => {
      const m = (l.sizes || "").match(/(\d+)\s*x\s*(\d+)/);
      const px = m ? +m[1] : 0;
      return px * 10 + (/\.png/i.test(l.href) ? 5 : 0) + (/192|180|512|256/.test(l.href) ? 3 : 0);
    };
    const candidates = links.sort((a, b) => score(b) - score(a)).map((l) =>
      l.href.startsWith("http") ? l.href : new URL(l.href, `https://${s.domain}/`).href,
    );
    candidates.push(`https://${s.domain}/favicon.ico`);

    for (const c of candidates) {
      try {
        const r = await get(c);
        const ok = r.status === 200 && /^image\//.test(r.type) && r.buf.length > 400;
        results.push(`  ${ok ? "OK  " : "skip"} ${c} -> ${r.status} ${r.type} ${report(c, r.buf)}`);
        if (ok && !chosen) chosen = { url: c, buf: r.buf, type: r.type };
        if (chosen) break;
      } catch (e) { results.push(`  err ${c} -> ${e.name}`); }
    }
  } catch (e) {
    results.push(`homepage fetch failed: ${e.name} ${e.message}`);
  }

  if (!chosen) {
    try {
      const r = await get(`https://www.google.com/s2/favicons?sz=128&domain=${s.domain}`);
      results.push(`  google s2 -> ${r.status} ${r.type} ${report("", r.buf)}`);
      if (r.status === 200 && /^image\//.test(r.type)) chosen = { url: "google s2", buf: r.buf, type: r.type };
    } catch (e) { results.push(`  google s2 err ${e.name}`); }
  }

  if (chosen) {
    const ext = /\.png$/i.test(chosen.url) || /png/.test(chosen.type) ? "png"
      : /\.svg$/i.test(chosen.url) ? "svg" : /gif/.test(chosen.type) ? "gif" : "ico";
    const file = path.join(outDir, `${s.slug}.${ext}`);
    fs.writeFileSync(file, chosen.buf);
    results.push(`SAVED images/communities/${s.slug}.${ext} from ${chosen.url}`);
  } else {
    results.push("FAILED - no icon downloaded");
  }
  console.log(`== ${s.name} (${s.domain})\n${results.join("\n")}`);
}
