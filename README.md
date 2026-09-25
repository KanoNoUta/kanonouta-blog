# Kano no Uta

Personal blog for `kanonouta.com`, built with Astro.

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
