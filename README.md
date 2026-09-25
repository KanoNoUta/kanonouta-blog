# Kano no Uta

Personal blog for `kanonouta.com`, built with Astro.

## Repositories and device setup

- `origin`: `KanoNoUta/kanonouta-blog-source`, the private source repository.
- `deploy`: `KanoNoUta/kanonouta-blog`, the existing public Cloudflare Pages repository.

Use Git authenticated as an account with access to the private repository,
Node.js >= 22.12.0, and pnpm (tested with 9.15.9). On another device:

```sh
git clone https://github.com/KanoNoUta/kanonouta-blog-source.git blog
cd blog
git remote add deploy https://github.com/KanoNoUta/kanonouta-blog.git
pnpm install --frozen-lockfile
pnpm dev --background
```

Before editing on another device, run `git pull --ff-only` from a clean working tree.
After committing changes, `git push` synchronizes the private source repository.
Local dependencies, build output, test artifacts, and environment secrets are not
part of the backup; install dependencies and configure any secrets on each device.

Publishing is separate: after verification, push with `git push deploy main` only
when the changes should go live. This triggers the existing Cloudflare Pages build.
The deployment repository remains public: pushing to it publishes the branch's
source and Git history, not just generated pages. Creating the private source
repository does not make previously published source private.

## Development

```sh
pnpm install
pnpm dev --background
pnpm exec astro dev status
pnpm exec astro dev stop
pnpm build
pnpm preview
```

## Content

Blog posts live in `src/content/blog/`.

Optional article translations live in `src/content/translations/<post-id>.<en|ja>.html`.
Only the current article and selected language are downloaded; Chinese stays server-rendered.
Use `<div data-code-ref="0"></div>` to reuse the first original highlighted code block
(indexes start at zero). UI labels and article metadata remain in `src/scripts/i18n.ts`.
Keep these files trusted, author-controlled HTML.

RSS is available at `/rss.xml`, and sitemap output is enabled for deploys.

## Verification

```sh
pnpm exec playwright install chromium
pnpm verify
```

`verify` runs Astro typechecking, a production build, and browser regressions.
The tests start their own preview on port 4331 and stop it afterward; the development
server on port 4321 is unaffected. For an installed Microsoft Edge on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
pnpm verify
```

Screenshots and failed-test traces are written to the ignored `test-results/` directory.
Coverage includes desktop/mobile routes, language persistence and races, code blocks,
blocked storage, map zoom/drag/reset, reduced motion, RSS, and the sitemap.

## Assets

The original PNGs and TTF font are retained. Pages use lossless WebP character art and
WOFF2 bitmap fonts. The About avatar has its own 288px image for its 96px display size.
When replacing artwork, regenerate its web versions as well as updating the original.
