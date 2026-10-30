/* scratch: strip the inline 1em institution icons from about/education/experience data */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const f of ['_data/about.yml', '_data/education.yml', '_data/experience.yml']) {
  const p = path.join(root, f);
  const before = fs.readFileSync(p, 'utf8');
  /* drop the <img ... style="width: 1em;"> tags and the single space that followed them */
  const after = before.replace(/<img src="https:\/\/github\.com\/user-attachments\/assets\/[0-9a-f-]+" style="width: 1em;"> /g, '');
  const n = (before.match(/<img /g) || []).length - (after.match(/<img /g) || []).length;
  fs.writeFileSync(p, after);
  console.log(f, 'removed', n, 'icons');
}
