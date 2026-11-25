// Refreshes the brand files the site keeps a copy of from the bedware-design checkout next to it.
// bedware-design is the source; the copies are committed so the site builds without it.
import { cp, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const design = resolve(root, process.env.BEDWARE_DESIGN_DIR ?? '../bedware-design');
const copies = [
  ['brand/logo', 'src/assets/brand', ['bedware.svg', 'bedware-software.svg', 'runwa.svg', 'vimperium.svg']],
  ['brand', 'src/assets/brand', ['backdrop.png', 'robot.png']],
  ['brand/icons/app/runwa', 'src/assets/brand', [['icon.png', 'runwa-icon.png']]],
  ['brand/icons/app/vimperium', 'src/assets/brand', [['icon.png', 'vimperium-icon.png']]],
];
for (const [from, to, files] of copies) {
  const list = files ?? (await readdir(join(design, from))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  for (const f of list) {
    const [src, dst] = Array.isArray(f) ? f : [f, f];
    await cp(join(design, from, src), join(root, to, dst));
    console.log(`✓ ${from}/${src} → ${to}/${dst}`);
  }
}
