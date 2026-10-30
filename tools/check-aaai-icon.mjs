// Read-only probe of aaai.org: pull the HTML head, list favicon/logo candidate
// URLs, then test whether each candidate serves an image.
const page = await fetch("https://aaai.org/", { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36" }, signal: AbortSignal.timeout(25000) });
const html = await page.text();
console.log("page:", page.status, page.headers.get("content-type"), html.length, "chars");

const head = html.slice(0, html.indexOf("</head>") + 7 || 20000);
const links = [...head.matchAll(/<link[^>]*rel="[^"]*(icon|shortcut)[^"]*"[^>]*>/gi)].map(m => m[0]);
console.log("--- icon link tags");
links.forEach(l => console.log(l));

const imgs = [...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi)].map(m => m[1])
  .filter(s => /logo|mark|brand|aaai/i.test(s));
console.log("--- logo-ish img srcs (first 15, unique)");
[...new Set(imgs)].slice(0, 15).forEach(s => console.log(s));

const candidates = [...new Set([
  ...links.map(l => (l.match(/href="([^"]+)"/) || [])[1]).filter(Boolean),
  ...imgs.slice(0, 6),
])].map(u => u.startsWith("//") ? "https:" + u : (u.startsWith("http") ? u : new URL(u, "https://aaai.org/").href));

console.log("--- reachability");
for (const url of candidates) {
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    const b = await r.arrayBuffer();
    console.log(`${r.status} ${r.headers.get("content-type")} ${b.byteLength}B  ${url}`);
  } catch (e) {
    console.log(`ERR ${e.name}  ${url}`);
  }
}
