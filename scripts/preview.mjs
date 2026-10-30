/**
 * Local preview renderer — mimics what Jekyll would output on GitHub Pages.
 * Renders _pages/about.md + _layouts/default.html with the same Liquid
 * templates and _data files, into preview/index.html.
 *
 * Usage: node scripts/preview.mjs   (deps: liquidjs, js-yaml — see README)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Liquid } from 'liquidjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- load config + data ---------- */
const config = yaml.load(fs.readFileSync(path.join(root, '_config.yml'), 'utf8'));

const dataDir = path.join(root, '_data');
const data = {};
for (const f of fs.readdirSync(dataDir)) {
  const name = f.replace(/\.ya?ml$/, '');
  data[name] = yaml.load(fs.readFileSync(path.join(dataDir, f), 'utf8'));
}

const site = { ...config, data };

/* ---------- minimal markdownify (preview only; Jekyll uses kramdown) ---------- */
function markdownify(str) {
  let s = String(str).trim();
  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]*)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  // bold: **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return `<p>${s}</p>`;
}

/* ---------- liquid engine ---------- */
const engine = new Liquid({
  root: [path.join(root, '_includes'), path.join(root, '_layouts')],
  extname: '.html',
  relativeReference: true,
  jekyllInclude: true,
});

engine.registerFilter('markdownify', markdownify);
engine.registerFilter('jsonify', (v) => JSON.stringify(v));
/* liquid (Jekyll) `slice` on a string returns an array of chars; liquidjs'
   built-in returns a substring — override so `name | slice: 0` yields one char */
engine.registerFilter('slice', (v, start, end) => {
  if (v == null) return v;
  if (typeof v === 'string') {
    const arr = [...v];
    const s = arr.slice(start, end === undefined ? undefined : end);
    return s.length === 1 ? s[0] : s.join('');
  }
  return Array.prototype.slice.call(v, start, end);
});

/* ---------- render ---------- */
const aboutRaw = fs.readFileSync(path.join(root, '_pages', 'about.md'), 'utf8');
const aboutBody = aboutRaw.replace(/^---[\s\S]*?---\s*/, '');

const pageCtx = {
  site,
  page: { base: '../', title: '', permalink: '/' }, // preview lives in /preview/
  content: '',
};

const body = await engine.parseAndRender(aboutBody, pageCtx);
const html = await engine.parseAndRender(
  fs.readFileSync(path.join(root, '_layouts', 'default.html'), 'utf8'),
  { ...pageCtx, content: body },
);

const outDir = path.join(root, 'preview');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('preview written to', path.join(outDir, 'index.html'));
