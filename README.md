# MINAM BREAK

Password-gated, private-use architectural destruction game for one requested building: 부산미남병원. A new implementation inspired by the idea of [SMASH 대학교](https://hong-iron.github.io/SMASH/). No code, illustrations, or interface design from Hong-Iron/SMASH is copied, because its license does not allow modified redistribution.

## Building references

- https://minamhospital.com/ (official exterior video, viewed 2026-10-28)
- https://m.nemectron.co.kr/article/납품사례/8/329/ (exterior photograph)

Geometry and materials are authored from photographic references. White offset facade planes, vertical navy signage, colored Minam mark, narrow glazing bands and ribbed side facade are reproduced. Unseen sides, ground floor, rooftop, dimensions and interior structure are approximated. This is not a measured scan or a photogrammetric digital twin. Photographs are not redistributed in the app.

## Local use

Node 22.13+. Use the Sites install/build helpers as documented by the installed Sites plugin. `npm run dev` starts the local Vinext app. Local-only `.dev.vars` must define `GAME_PASSWORD` and `SESSION_SECRET`; neither may be committed. `SESSION_SECRET` must be a random 32-byte-or-stronger secret in production. A missing secret or D1 binding fails closed. Apply the generated D1 migration locally before login tests.

## Access control

The landing page is reachable anonymously so the invited player does not need a ChatGPT account. `/play` is server-gated with a 24-hour HMAC-signed, HttpOnly, SameSite=Strict cookie (Secure in HTTPS). Password changes invalidate existing cookies. Authentication secrets live only in Sites runtime secret settings. D1 atomically rate-limits attempts: 8 per IP per 15-minute window and 50 globally per hour. IP addresses are stored only as keyed hashes, with stale rows cleaned on subsequent attempts. Both login and logout require a same-origin request. Robots are blocked and responses containing user state must not be cached. A shared four-digit password limits access to people who know it; it does not verify a specific person. Client assets necessarily remain inspectable.

## Controls

- Tap/click a building surface to hit; hold to hit repeatedly.
- Drag to orbit; wheel or pinch to zoom. Orbit mode disables accidental hits.
- 1: hammer, 2: shockwave, R: rebuild, Space: hit at screen center.
- Sound is synthesized locally after interaction. No external analytics, multiplayer, or messages.

## Dependencies

Three.js 0.186.1, vendored under `lib/vendor/`; license at `public/vendor/THREE-LICENSE.txt`. Vinext/React/Cloudflare Sites starter dependencies are in package-lock.json. The interface uses DM Sans and Noto Sans KR from Google Fonts with system fallbacks.

## Verification

`node --test tests/session.test.mjs`; `npx tsc --noEmit`; Sites production build; HTTP checks of login, gated routes, logout and throttling; browser checks of successful play, destruction, rebuild, orbit, mute and responsive layout.
