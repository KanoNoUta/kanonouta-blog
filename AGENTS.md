## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Source synchronization and deployment

- `origin` is the private source repository: `KanoNoUta/kanonouta-blog-source`.
- `deploy` is the existing public Cloudflare Pages repository: `KanoNoUta/kanonouta-blog`.
- Source backup and cross-device synchronization use `git push origin main`.
- Push to `deploy` only when the user explicitly asks to publish or update the live site.
- A public deployment push exposes that branch's source and history; do not treat it as private backup.
- When publishing, synchronize the private source first, then push `git push deploy main` and verify the live site.
- Never commit credentials or local environment files to either repository.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
