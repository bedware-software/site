// Collects the product data the site is built from.
//
// For each application it reads the README (introduction, `## Highlights`,
// `### …` entries under `## Feature tour` with their screenshots) and the latest
// GitHub release (version, date, installers). Output: src/content/apps/<slug>/
// (data.json + images), git-ignored and rebuilt on every `npm run build`.
//
// Source of the README and screenshots:
//   default                  — the repository's main branch on GitHub, at one commit
//   BEDWARE_APPS_DIR=..      — local checkouts next to this one (to preview unpushed READMEs)
// GITHUB_TOKEN is optional and only raises the API rate limit.

import { mkdir, readFile, rm, writeFile, copyFile, access } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/content/apps');
const ORG = 'bedware-software';
const APPS = ['runwa', 'vimperium'];
const LOCAL = process.env.BEDWARE_APPS_DIR ? resolve(ROOT, process.env.BEDWARE_APPS_DIR) : null;

const headers = { accept: 'application/vnd.github+json', 'user-agent': 'bedware-site-build' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function raw(repo, sha, file) {
  const res = await fetch(`https://raw.githubusercontent.com/${ORG}/${repo}/${sha}/${file}`);
  if (!res.ok) throw new Error(`${repo}/${file}@${sha.slice(0, 7)}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const exists = (p) => access(p).then(() => true, () => false);

// ---------- README ----------

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Inline Markdown the site needs: `keys`, [links](url), **bold**. Everything else is text.
function inline(md) {
  const out = [];
  const re = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const m of md.matchAll(re)) {
    out.push(esc(md.slice(last, m.index)));
    if (m[1] !== undefined) out.push(`<kbd class="bw-kbd">${esc(m[1])}</kbd>`);
    else if (m[2] !== undefined) out.push(`<a href="${esc(m[3])}">${esc(m[2])}</a>`);
    else out.push(`<strong>${esc(m[4])}</strong>`);
    last = m.index + m[0].length;
  }
  out.push(esc(md.slice(last)));
  return out.join('');
}

const plain = (md) => md.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');

// Splits the README into sections by heading; paragraphs are joined lines.
function parseReadme(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let name = '';
  const intro = [];
  const highlights = [];
  const tour = [];
  let h2 = null;
  let entry = null;
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const p = para.join(' ').trim();
    para = [];
    if (!p) return;
    if (h2 === null) { if (!/^(!\[|<)/.test(p)) intro.push(p); }
    else if (entry) {
      const img = p.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (img) entry.image = { alt: img[1], src: img[2] };
      else entry.body.push(p);
    }
  };
  let fence = false;
  for (const line of lines) {
    if (/^```/.test(line)) { fence = !fence; flush(); continue; }
    if (fence) continue;
    let m;
    if ((m = line.match(/^# (.+)/))) { flush(); name = m[1].trim(); continue; }
    if ((m = line.match(/^## (.+)/))) { flush(); h2 = m[1].trim().toLowerCase(); entry = null; continue; }
    if ((m = line.match(/^### (.+)/))) {
      flush();
      entry = null;
      if (h2 === 'feature tour') { entry = { title: m[1].trim(), body: [], image: null }; tour.push(entry); }
      continue;
    }
    if (h2 === 'highlights' && (m = line.match(/^[-*] (.+)/))) { flush(); highlights.push(m[1].trim()); continue; }
    if (!line.trim()) { flush(); continue; }
    if (h2 === null || (h2 === 'feature tour' && entry)) para.push(line.trim());
  }
  flush();
  return { name, intro, highlights, tour };
}

// ---------- release ----------

function installers(assets) {
  const pick = (re, not) => assets.filter((a) => re.test(a.name) && !(not && not.test(a.name)))
    .sort((a, b) => a.name.length - b.name.length)[0];
  const list = [
    ['mac-arm', 'macOS', 'Apple silicon', pick(/arm64\.dmg$/i)],
    ['mac-intel', 'macOS', 'Intel', pick(/\.dmg$/i, /arm64/i)],
    ['windows', 'Windows', 'Installer', pick(/setup.*\.exe$/i) ?? pick(/\.exe$/i)],
    ['linux', 'Linux', 'AppImage', pick(/\.appimage$/i)],
  ];
  return list.filter(([, , , a]) => a).map(([id, os, kind, a]) => ({
    id, os, kind, file: a.name, url: a.browser_download_url, size: a.size,
  }));
}

async function release(repo) {
  try {
    const r = await api(`/repos/${ORG}/${repo}/releases/latest`);
    return {
      version: r.tag_name.replace(/^v/, ''),
      tag: r.tag_name,
      date: r.published_at,
      url: r.html_url,
      installers: installers(r.assets ?? []),
    };
  } catch (e) {
    console.warn(`! ${repo}: no release data (${e.message})`);
    return null;
  }
}

// ---------- per app ----------

async function syncApp(slug) {
  const dir = join(OUT, slug);
  let readme;
  let readFile_;
  let source;
  if (LOCAL) {
    const base = join(LOCAL, slug);
    readme = await readFile(join(base, 'README.md'), 'utf8');
    readFile_ = (f) => readFile(join(base, f));
    source = `local ${base}`;
  } else {
    const commit = await api(`/repos/${ORG}/${slug}/commits/main`);
    const sha = commit.sha;
    readme = (await raw(slug, sha, 'README.md')).toString('utf8');
    readFile_ = (f) => raw(slug, sha, f);
    source = `github ${slug}@${sha.slice(0, 7)}`;
  }

  const doc = parseReadme(readme);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const features = [];
  for (const f of doc.tour) {
    if (!f.image) { console.warn(`! ${slug}: "${f.title}" has no image, skipped`); continue; }
    const file = basename(f.image.src);
    const path = f.image.src.replace(/^\.?\//, '');
    await writeFile(join(dir, file), await readFile_(path));
    // The light-theme frame, by convention next to it in light/ (optional).
    const lightPath = path.replace(/([^/]+)$/, 'light/$1');
    try {
      const light = await readFile_(lightPath);
      await mkdir(join(dir, 'light'), { recursive: true });
      await writeFile(join(dir, 'light', file), light);
    } catch { /* no light frame yet: the dark one is shown in both themes */ }
    features.push({
      title: f.title,
      html: f.body.map(inline),
      text: plain(f.body.join(' ')),
      image: file,
      alt: f.image.alt,
    });
  }
  if (!features.length) console.warn(`! ${slug}: README has no "## Feature tour" yet — the page shows no tour`);

  const data = {
    slug,
    name: doc.name || slug,
    repo: `https://github.com/${ORG}/${slug}`,
    intro: doc.intro.map(inline),
    summary: plain(doc.intro[0] ?? '').split(/(?<=\.)\s/)[0],
    highlights: doc.highlights.map(inline),
    features,
    release: await release(slug),
    source,
  };
  await writeFile(join(dir, 'data.json'), JSON.stringify(data, null, 2));
  console.log(`✓ ${slug}: ${features.length} features, release ${data.release?.tag ?? '—'} (${source})`);
}

try {
  for (const slug of APPS) await syncApp(slug);
} catch (e) {
  // Offline or rate-limited: keep the last snapshot if there is one.
  if (await exists(join(OUT, APPS[0], 'data.json'))) {
    console.warn(`! sync failed (${e.message}); using the previous snapshot`);
  } else {
    console.error(`sync failed: ${e.message}`);
    process.exit(1);
  }
}
