# OCA · Hermes Core homepage (v3)

Next.js 15 static export with one persistent Three.js scene (the Hermes Core), GPU particle systems, GSAP ScrollTrigger and Lenis.

## Run

```
npm install
npm run dev        # http://127.0.0.1:3100
npm run typecheck
npm run build      # static export to ./out (prebuild fetches the approved assets and draws the favicon set)
npm run preview    # serve ./out on :3101
```

## What the scene does (components/CoreScene.tsx)

1. Inbox storm opener: message, call, invoice and mail glyphs drift over the page, get pulled into the heart, the core assembles out of it. Skipped on a mid-page reload.
2. Hero scroll: the core opens (four labelled systems), the camera dives through the front loop into the circuit inside (three nodes, traces, pulses), pulls back, the solids dissolve into an orbital band, the band spells HANDLED., the word collapses into a travelling signal.
3. One becomes six: in the employee section the core splits into six mini cores that fly into the round slot on each card (they turn faster on hover) and merge back on the way out.
4. Scrolling light: the core publishes `--lx`, `--ly`, `--lp` on `<html>` and `--cx`, `--cy`, `--cp` on every `[data-lit]` card, so the page and the cards catch its light. The environment map rotates with scroll so reflections slide.
5. Pointer: the core turns toward the cursor, the key light follows it, particles and glyphs part around it.

Touch devices: the scene starts after first paint, device pixel ratio capped at 1.25, smaller particle counts.

## Configuration (`.env`, all build-time)

- `NEXT_PUBLIC_SITE_URL`: real site URL for canonical, sitemap, Open Graph and structured data.
- `NEXT_PUBLIC_INDEX`: `true` only for the approved production domain. Anything else renders `noindex, nofollow` and a `Disallow: /` robots.txt.
- `NEXT_PUBLIC_CALENDLY_URL`: when set, every "Book a call" button opens this URL. When unset, a dialog links to the booking page on oneclickaway.io and the published phone number.
- `NEXT_PUBLIC_LEAD_ENDPOINT`: an HTTPS endpoint that accepts `POST` JSON `{ name, whatsapp, industry, source, page }`. `demo` shows the form and simulates success (preview only, labelled). Empty hides the form.
- `NEXT_PUBLIC_NEWSLETTER_ENDPOINT`: optional. `POST` JSON `{ email, source }`. Empty hides the sign-up.
- Outbound links carry `utm_source=oca-hermes&utm_medium=website&utm_campaign=homepage`.

## Page features

Industry switch (Clinic, Salon, Pet care, Workshop, Real estate; remembered per visitor) drives the headline, the 09:38 moment, the routing board input, the approval example, the chat demo and the calculator default. Scripted chat demo (keyword rules, nothing sent). Missed-revenue calculator (visitor's own inputs, no recovery claims). Comparison table. Sticky mobile action bar (Book, Call). Lead capture (name + WhatsApp number). Search (Ctrl/Cmd K), light mode, reduce motion, higher contrast, back to top, 404 page, print stylesheet, JSON-LD (Organization, Service, WebSite, FAQPage), sitemap, robots, web manifest and favicon set.

## Assets

- `public/images/hermes-core*.webp`: Higgsfield job `0112c794-1056-4e2a-9f4a-eaa7a916cd45` (interlocking core). Still for reduced motion and no-WebGL, and the OG image.
- `public/images/hermes-exploded*.webp`: job `ff0a18f0-1fd7-4b21-b39f-177856016172`. Proof section.
- `public/images/hermes-prism*.webp`: job `ba5cc6e0-9f8e-4f45-8f0d-93eeb7e624a2`. Cinematic frame section (a still; no film has been produced).
- `public/fonts`: Just Sans and Kross Neue Grotesk, OCA's own brand fonts, self-hosted from the live site's public assets.
- Favicons are drawn from the brand mark by `scripts/fetch-assets.mjs`.

No new images or video were generated for this build.

## Reduced motion and no WebGL

System preference, the on-page switch, or a failed WebGL context: the hero shows the still of the core, no canvas is created, no scrubbed scroll, no parallax, the employee cards show icons instead of mini cores. Preferences persist in localStorage and are applied before first paint.

See `LAUNCH.md` for the launch checklist.
