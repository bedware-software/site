# bedware.software

The website of bedware software: a home page and one page for each open-source app,
[Runwa](https://github.com/bedware-software/runwa) (a command palette) and
[Vimperium](https://github.com/bedware-software/vimperium) (a browser driven by Vim keys).

A static site built with [Astro](https://astro.build). The look comes from the bedware design system,
the `@bedware/ui` package (tokens and `bw-*` classes) from
[bedware-design](https://github.com/bedware-software/bedware-design).

## Run it

Node 22.23.4 or newer (what Astro 7 requires).

```bash
npm ci
npm run dev      # sync the app data, then the dev server on http://localhost:4321
npm run build    # sync the app data, then the static site in dist/
npm run preview  # serve dist/
```

## Where the content comes from

The home page's text lives in this repository (`src/pages/index.astro`). The app pages are built from the apps' own READMEs.

`scripts/sync.mjs` runs before every `dev` and `build`. For each app it reads:

- **the README** on the `main` branch (one commit, so text and pictures match):
  - the introduction (the paragraphs before the first `##`);
  - `## Highlights`;
  - every `###` entry under `## Feature tour`, with its screenshot.
- **the screenshots** the tour links, from `docs/screenshots/`. The light-theme frame of the same name comes from `docs/screenshots/light/`. In the light theme the site shows the light frame.
- **the latest GitHub release**: version, date and installers for the download buttons.

The result goes to `src/content/apps/<slug>/` (`data.json` and the images). The folder is git-ignored and rebuilt every time.

To see READMEs and screenshots that are not pushed yet, read the app checkouts next to this one instead of GitHub:

```bash
BEDWARE_APPS_DIR=.. npm run dev
```

`GITHUB_TOKEN` is optional. It only raises the GitHub API rate limit.

What a README does not say (an app's one-line kind, logo, icon, and the screenshot shown on the home page) is set in `src/lib/apps.ts`.

## Brand files

`src/assets/brand/` keeps copies of the logos, app icons, the code-rain backdrop and the robot from bedware-design. They are committed, so the site builds without that repository. To refresh them from a bedware-design checkout next to this one (or from `BEDWARE_DESIGN_DIR`), run:

```bash
npm run brand
```

`logo-light-plates.svg` (the home page logo for the light theme) belongs to the site itself. The app names for the light theme are drawn from the app logos in `src/lib/apps.ts`: black letters on a yellow plate.

## Design options to choose from

When a design question is open, every option is built into the page. The owner picks one by looking at the live page.

- `src/lib/review.ts` lists the questions. Each has its options and the one currently in use (`current`).
- `src/components/Alt.astro` wraps the markup of one option.
- In `npm run dev`, a bar at the bottom of the page switches between options and copies the answer.
- A production build keeps only `current`.

Once an option is chosen, set `current`, then delete the other options and the question. With no questions, the bar is not shown.

## Deploy

The site is deployed with [Coolify](https://coolify.io) as a static site:

- install: `npm ci`
- build: `npm run build`
- publish directory: `dist`
- build pack: Nixpacks, static, with `NIXPACKS_NODE_VERSION=24` (its Node 22 is too old for Astro)
- domains: `https://bedware.software`, and `https://www.bedware.software` redirecting to it

A push to `main` of this repository runs `.github/workflows/deploy.yml`, which asks Coolify to rebuild the site.

Each app repository has a `Refresh bedware.software` workflow. It asks Coolify to rebuild the site when the README or screenshots change on `main`, after a successful build of the distributables, and when a release is published. Both workflows can also be started by hand (Actions → Run workflow). They need two repository secrets, set in this repository and in both app repositories:

- `COOLIFY_SITE_DEPLOY_URL`: the deploy webhook of the site in Coolify;
- `COOLIFY_SITE_TOKEN`: a Coolify API token with the `deploy` permission only (named "GitHub Actions - site deploy" in Coolify).

The deploy request must be a POST: Coolify answers a GET with 405. Without the secrets the workflows do nothing and exit successfully.
