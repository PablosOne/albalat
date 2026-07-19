# Artist website template

This Astro project is a reusable bilingual portfolio template for a performing artist. The visual system, horizontal showcase, detail lanes, consent handling, SEO, and structured data are reusable; artist-specific settings and collections are isolated behind configuration and content modules.

## Start a new site

1. Edit `src/config/site.ts`. This is the main template entry point for the production domain, languages, artist identity, contact details, social profiles, brand colors, asset paths, page titles, descriptions, legal identity, and credits.
2. Replace the teaser and homepage-stage copy in `src/data/site.ts`.
3. Replace the long-form biography in `src/components/content/AboutContent.astro` and service copy in `src/components/content/ClassesContent.astro`.
4. Replace `src/data/discography.ts` and `src/data/videos.ts`. The music and video schemas are generated from these collections automatically.
5. Replace images under `public/images`, the favicon, and—if needed—fonts under `public/fonts`. Keep the configured asset paths in sync.
6. Review both legal-language variants in `src/components/LegalPage.astro`; legal requirements depend on the owner, providers, and jurisdiction.
7. Copy `.env.example` to `.env` and fill only the integrations the new site uses.

Run:

```sh
npm install
npm run check
npm test
npm run build
```

## Architecture

- `src/config/site.ts`: typed deployment and identity configuration, route metadata, and localized-path helpers.
- `src/components/ArtistPage.astro`: reusable shell for all five core routes.
- `src/lib/structuredData.ts`: schema.org factory driven by the page ID and content collections.
- `src/components/Showcase.astro`: visual stage; the homepage includes every interactive lane while detail routes include only their own long-form lane.
- `src/data/site.ts`: homepage panels and short biography.
- `src/data/discography.ts`, `src/data/videos.ts`: replaceable media collections.
- `src/i18n/*.json`: reusable interface translations.
- `src/pages/*`: intentionally thin route declarations.

The CTA links use real localized URLs. On the homepage, the lane controller intercepts them to preserve the animation. With JavaScript disabled—or when a crawler follows them—they behave as ordinary page links.

## Add or remove a core section

Add its identifier and localized metadata in `src/config/site.ts`, add its content renderer in `Showcase.astro`, and create the thin Spanish and English route files. If it needs structured data, add one case to `src/lib/structuredData.ts`. Keeping route declarations thin prevents SEO and layout logic from being copied between languages.

## Deployment and indexing

`robots.txt` and the sitemap derive from the canonical origin in `src/config/site.ts`. After deployment, configure permanent platform-level redirects from `www` and any public preview domain to the canonical origin. Then verify a Google Search Console Domain property and submit `/sitemap-index.xml`.

The explicit 404 pages are marked `noindex`. Detail routes emit only their own long-form detail content, avoiding the duplicate-body problem common to animated single-page designs.
