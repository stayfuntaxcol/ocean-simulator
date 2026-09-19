import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  entryPoints: [root + 'graphics/reef-quality-review.js'], bundle: true,
  minify: true, format: 'iife', target: 'es2022', write: false, legalComments: 'inline',
});
let html = await readFile(root + 'graphics/reef-quality-review.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
// A standalone review has no parent project to navigate to. Don't send the user
// to a file:// parent or imply that a not-yet-deployed feature is already online.
html = html.replace(/<a href="\.\.\/\?scene=reference&reef=organic"[^>]*>[^<]*<\/a>/,
  '<span style="color:#b1cdc9">Zelfstandig proefbestand · geen installatie nodig</span>');
html = html.replace('<script type="module" src="./reef-quality-review.js"></script>',
  () => '<script>' + result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script') + '</script>');
await mkdir(root + 'dist', { recursive: true });
await writeFile(root + 'dist/Ocean-Rif-Proef.html', html);
console.log('Built dist/Ocean-Rif-Proef.html — self-contained, no network or Firebase required.');
