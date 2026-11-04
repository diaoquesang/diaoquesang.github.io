// Dev-only static server, for when a real http:// origin is needed instead of the
// file:// preview (same-origin media, fetch(), Web Audio, service workers...).
//
//   node scripts/serve.mjs          -> http://127.0.0.1:4173/preview/index.html
//
// scripts/ and preview/ are both in _config.yml exclude, so nothing here ships.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// resolve() strips the trailing separator fileURLToPath leaves on directory URLs,
// which otherwise makes the `ROOT + sep` containment check below never match (403).
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/preview/index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep)) { res.writeHead(403).end('forbidden'); return; }

  let body;
  try {
    body = await readFile(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found: ' + path);
    return;
  }

  const headers = {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
    'accept-ranges': 'bytes',
  };

  // Byte ranges are not optional here: answering a Range request with a plain 200
  // makes Chrome treat the MP3 as an unseekable stream and report its duration as
  // Infinity, which showed up as "Infinity:NaN" in the player bar. GitHub Pages
  // answers 206, so mimic that.
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    const size = body.length;
    let start, end;
    if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1; }
    else { start = Math.max(0, size - Number(m[2])); end = size - 1; } // suffix form: bytes=-N
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      'content-range': `bytes ${start}-${end}/${size}`,
      'content-length': end - start + 1,
    }).end(body.subarray(start, end + 1));
    return;
  }

  res.writeHead(200, { ...headers, 'content-length': body.length }).end(body);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/preview/index.html`);
});
