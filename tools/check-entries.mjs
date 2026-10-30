/* scratch check: education/experience YAML field counts (run: node tools/check-entries.mjs) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

for (const f of ['education', 'experience']) {
  const d = yaml.load(fs.readFileSync(path.join(root, '_data', f + '.yml'), 'utf8'));
  d.forEach((e, i) => {
    const imgs = (e.text_html.match(/<img /g) || []).length;
    const links = (e.text_html.match(/<a /g) || []).length;
    const hrefs = (e.text_html.match(/href="([^"]+)"/g) || []).map(s => s.slice(6, -1));
    console.log(f + i, '| date:', e.date, '| imgs:', imgs, '| links:', links);
    hrefs.forEach(h => console.log('   ', h));
  });
}
