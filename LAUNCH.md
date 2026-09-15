# Launch checklist (everything except DNS)

Status as of the v3 preview at https://oca-hermes-homepage.vercel.app

## Done in the build
- [x] Favicon set: `favicon.ico` (16/32/48), `icon.png` 512, `apple-icon.png` 180, manifest icons 192/512 plus maskable. Drawn from the brand mark at build time.
- [x] Web manifest (`/manifest.webmanifest`), theme colour for light and dark.
- [x] 404: static `404.html` returns HTTP 404 with links back to the homepage and pricing (verified anonymously).
- [x] SEO: title, description, canonical, Open Graph and Twitter card (`/images/og.jpg` 1200x630), JSON-LD Organization, Service (price from AED 15,000), WebSite and FAQPage. Only verified facts: published phone, UAE positioning, published build price.
- [x] `sitemap.xml` and `robots.txt` generated from `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_INDEX`.
- [x] Reduced motion and no-WebGL fallback with the still image; axe-core run clean except the brand-red small labels (see below).
- [x] Performance: WebGL starts after first paint on touch devices, pixel ratio capped, fonts self-hosted and preloaded by next/font, hero still image marked `fetchpriority=high` when used.

## Before pointing the real domain
1. Set the Vercel production environment: `NEXT_PUBLIC_SITE_URL=https://oneclickaway.io` (or the final host), `NEXT_PUBLIC_INDEX=true`. Redeploy. Confirm `<meta name="robots">` is gone and `robots.txt` reads `Allow: /`.
2. Set `NEXT_PUBLIC_LEAD_ENDPOINT` to the real lead endpoint (or leave empty to hide the form). Remove the `demo` value; it is labelled "PREVIEW: NOTHING WAS SENT" on purpose.
3. Set `NEXT_PUBLIC_CALENDLY_URL` if booking should open Calendly directly.
4. Vercel Authentication: the project has SSO protection on; `oca-hermes-homepage.vercel.app` is exempt so the preview is public. For the real domain either keep protection on non-production deployments only, or disable it for production in Project Settings, Deployment Protection. Verify with a private window (a login redirect is not public).
5. Run the QA scripts against the production URL: `URL=https://... node qa/interact.mjs`, `node qa/v3.mjs`, `node qa/shot.mjs`.
6. Submit `sitemap.xml` in Search Console once the domain is live (DNS is out of scope here).

## Known, deliberate
- Small red labels (kickers, "HANDLED", roles) use the brand red on dark, which is 3.3:1 against the background. They are decorative; the "Higher contrast" switch turns them ivory and passes AA. Change `--red` only with a brand decision.
- The chat demo and calculator are illustrative and say so on the page.
