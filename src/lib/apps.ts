import type { ImageMetadata } from 'astro';
import runwaLogo from '../assets/brand/runwa.svg?raw';
import vimperiumLogo from '../assets/brand/vimperium.svg?raw';
import runwaIcon from '../assets/brand/runwa-icon.png';
import vimperiumIcon from '../assets/brand/vimperium-icon.png';

export interface Installer { id: string; os: string; kind: string; file: string; url: string; size: number }
export interface Release { version: string; tag: string; date: string; url: string; installers: Installer[] }
export interface Feature { title: string; html: string[]; text: string; image: string; alt: string }
export interface AppData {
  slug: string; name: string; repo: string; intro: string[]; summary: string;
  highlights: string[]; features: Feature[]; release: Release | null;
}

export interface App extends AppData {
  kicker: string;
  logo: string;
  /** The logo for white pages: black letters on a yellow plate. */
  logoLight: string;
  /** The screenshot shown on the home page and in the app page's header (default: the first feature's). */
  homeShot?: string;
  icon: ImageMetadata;
  shots: Record<string, ImageMetadata>;
}

// What the README does not say: the product's one-line kind and its brand files.
// homeShot: Window Switcher still shows made-up windows; App Search shows real apps.
const brand: Record<string, { kicker: string; logo: string; icon: ImageMetadata; homeShot?: string }> = {
  runwa: { kicker: 'Command palette for the desktop', logo: runwaLogo, icon: runwaIcon, homeShot: 'palette-app-search.png' },
  vimperium: { kicker: 'Keyboard-driven browser', logo: vimperiumLogo, icon: vimperiumIcon },
};

// The yellow logo cannot sit on white. Like the home page's light logo, the letters turn
// black and a yellow plate with a darker bottom edge goes under them, at the letters' tilt.
// Logo files: one <g transform="translate(x y) rotate(a) scale(k -k)"> of glyphs set 620 units apart.
const onPlate = (svg: string) => {
  const m = svg.match(/<g transform="translate\(([\d.]+) ([\d.]+)\) rotate\((-?[\d.]+)\) scale\(([\d.]+)/);
  if (!m) return svg;
  const [x, y, a, k] = m.slice(1, 5).map(Number);
  const glyphs = (svg.match(/<path /g) ?? []).length;
  // A descender (the p in Vimperium) reaches 180 units under the baseline: the plate covers it too.
  const deep = / d="[^"]*-180/.test(svg);
  const pad = 14, top = y - 730 * k - pad, bottom = y + (deep ? 180 * k + 8 : pad);
  const width = glyphs * 620 * k + pad * 2 - 20 * k;
  const plate = `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - pad}" y="${top}" width="${width}" height="${bottom - top}" fill="#ffde5d"/>`
    + `<rect x="${x - pad}" y="${bottom - 5}" width="${width}" height="5" fill="#e5c440"/></g>`;
  // Same view box as the yellow logo, so both themes show the letters at one size;
  // the plate's tilted far end may stick out above it.
  return svg
    .replace('<svg ', '<svg overflow="visible" ')
    .replace(/#ffde5d/g, '#000000')
    .replace(/(<svg[^>]*>)/, `$1${plate}`);
};

const data = import.meta.glob<AppData>('../content/apps/*/data.json', { eager: true, import: 'default' });
const images = import.meta.glob<ImageMetadata>('../content/apps/*/**/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' });

export const apps: App[] = Object.values(data)
  .map((d) => {
    const shots: Record<string, ImageMetadata> = {};
    for (const [path, img] of Object.entries(images)) {
      const m = path.match(/apps\/([^/]+)\/(.+)$/);
      if (m && m[1] === d.slug) shots[m[2]] = img;
    }
    const b = brand[d.slug];
    return { ...d, ...b, logoLight: onPlate(b.logo), shots };
  })
  .sort((a, b) => Object.keys(brand).indexOf(a.slug) - Object.keys(brand).indexOf(b.slug));

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatSize = (bytes: number) => `${Math.round(bytes / 1048576)} MB`;

export const pad = (n: number) => String(n).padStart(2, '0');
