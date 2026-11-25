# bedware.software

The website of bedware software: a home page and one page for each open-source app,
[Runwa](https://github.com/bedware-software/runwa) (a command palette) and
[Vimperium](https://github.com/bedware-software/vimperium) (a browser driven by Vim keys).

A static site built with [Astro](https://astro.build). The look comes from the bedware design system,
the `@bedware/ui` package (tokens and `bw-*` classes) from
[bedware-design](https://github.com/bedware-software/bedware-design).

## Run it

Node 22 or newer.

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

Each app repository has a `Refresh bedware.software` workflow. It asks Coolify to rebuild the site when the README or screenshots change on `main`, after a successful build of the distributables, and when a release is published. The workflow needs two repository secrets:

- `COOLIFY_SITE_DEPLOY_URL`: the deploy webhook of the site in Coolify;
- `COOLIFY_SITE_TOKEN`: a Coolify API token allowed to deploy.

Without these secrets the workflow does nothing and exits successfully.
