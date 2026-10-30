/**
 * Second-pass icon fetch for the communities whose homepage gave nothing away:
 * try a list of candidate URLs and save the first real image.
 *
 * Usage: node tools/fetch-extra-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "images", "communities");
fs.mkdirSync(outDir, { recursive: true });

const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" };

const jobs = [
  {
    slug: "ieee",
    urls: [
      "https://ieee.org/favicon.ico",
      "https://www.ieee.org/favicon.ico",
      "https://www.ieee.org/images/favicon.ico",
      "https://spectrum.ieee.org/favicon.ico",
      "https://ieeexplore.ieee.org/assets/img/favicon-16x16.png",
      "https://ieeexplore.ieee.org/favicons/favicon-32x32.png",
      "https://www.google.com/s2/favicons?sz=128&domain=ieee.org",
    ],
  },
  {
    slug: "zcfcia",
    urls: [
      "https://www.zcfcia.org.cn/favicon.ico",
      "http://www.zcfcia.org.cn/favicon.ico",
      "http://zcfcia.org.cn/favicon.ico",
      "http://zcfcia.org.cn/template/skin/1/images/favicon.ico",
      "https://www.google.com/s2/favicons?sz=128&domain=zcfcia.org.cn",
    ],
  },
];

async function get(url) {
  const res = await fetch(url, { redirect: "follow", headers: UA, signal: AbortSignal.timeout(20000) });
  return { status: res.status, type: res.headers.get("content-type") || "", buf: Buffer.from(await res.arrayBuffer()) };
}

for (const job of jobs) {
  console.log(`== ${job.slug}`);
  for (const url of job.urls) {
    try {
      const r = await get(url);
      const ok = r.status === 200 && /^image\//.test(r.type) && r.buf.length > 400;
      console.log(`  ${ok ? "OK  " : "skip"} ${url} -> ${r.status} ${r.type} ${r.buf.length}B`);
      if (ok) {
        const ext = /png/.test(r.type) ? "png" : /gif/.test(r.type) ? "gif" : /svg/.test(r.type) ? "svg" : "ico";
        fs.writeFileSync(path.join(outDir, `${job.slug}.${ext}`), r.buf);
        console.log(`  SAVED images/communities/${job.slug}.${ext}`);
        break;
      }
    } catch (e) {
      console.log(`  err ${url} -> ${e.name} ${e.message}`);
    }
  }
}
