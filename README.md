# MINAM BREAK

**Play: https://llouis0622.github.io/stress/**

A 3D architectural destruction game for 부산미남병원, published from this public repository to GitHub Pages. A new implementation inspired by the idea of [SMASH 대학교](https://hong-iron.github.io/SMASH/). No code, illustrations, or interface design from Hong-Iron/SMASH is copied, because its license does not allow modified redistribution.

## Building references

- https://minamhospital.com/ (official exterior video, viewed 2026-10-28)
- https://m.nemectron.co.kr/article/납품사례/8/329/ (exterior photograph)

Geometry and materials are authored from photographic references. The official floor guide identifies 13F as the rooftop garden. The visible facade is rebuilt with 13 levels, staggered white wall planes, thin side glazing, 14 vertical street-facing bays and a three-storey lattice podium. Projective texture mapping uses measured quadrilaterals of the official full exterior photograph; each fragment retains its original texture coordinates during destruction. Unseen sides, ground floor, rooftop, dimensions and interior structure are approximated. This is not a measured scan or a photogrammetric digital twin. The official facade photograph is included as a rendering texture at `public/reference/minam-facade.webp`, with attribution in the in-game help and this README. Source: https://minamhospital.com/img/images/information/3/image.webp. Only facade regions are used in the model. Other reference imagery is not redistributed.

## GitHub Pages

Pages publishes the committed `docs/` folder on `main`. All asset paths are relative, so the game runs under `/stress/` without a backend. The browser opens the compressed game bundle using a four-digit password (PBKDF2-SHA256, 310,000 iterations, AES-256-GCM). Passwords are not embedded in the generated files. Reloading or pressing the lock button returns to the entry screen.

This is a convenience entry gate, not identity-based access control: the source code is public and a four-digit password is guessable offline. GitHub Pages cannot run the original server authentication. Do not use this gate to protect sensitive data.

Rebuild with Node 22.13+ after changing the game (zsh):

```sh
npm ci
read -rs 'GAME_PASSWORD?Four-digit entry code: '
export GAME_PASSWORD
npm run build:pages
unset GAME_PASSWORD
```

Commit the source and generated `docs/` files, then push to `main`. GitHub Pages automatically republishes them. To preview locally, serve `docs/` with any static HTTP server. Use HTTPS or localhost for Web Crypto.

## Optional server version

Node 22.13+. Use the Sites install/build helpers as documented by the installed Sites plugin. `npm run dev` starts the local Vinext app. Local-only `.dev.vars` must define `GAME_PASSWORD` and `SESSION_SECRET`; neither may be committed. `SESSION_SECRET` must be a random 32-byte-or-stronger secret in production. A missing secret or D1 binding fails closed. Apply the generated D1 migration locally before login tests.

### Server access control

The landing page is reachable anonymously so the invited player does not need a ChatGPT account. `/play` is server-gated with a 24-hour HMAC-signed, HttpOnly, SameSite=Strict cookie (Secure in HTTPS). Password changes invalidate existing cookies. Authentication secrets live only in Sites runtime secret settings. D1 atomically rate-limits attempts using a write/read batch: 8 per IP per 15-minute window and 50 globally per hour. IP addresses are stored only as keyed hashes, with stale rows cleaned on subsequent attempts. Both login and logout require a same-origin request. Robots are blocked and responses containing user state must not be cached. A shared four-digit password limits access to people who know it; it does not verify a specific person. Client assets necessarily remain inspectable.

## Controls

- Tap/click a building surface to hit; hold to hit repeatedly.
- Drag to orbit; wheel or pinch to zoom. Orbit mode disables accidental hits.
- 1: hammer, 2: shockwave, 3: laser, 4: meteor, 5: earthquake. U undoes one hit (10-step history); R rebuilds; Space hits at screen center.
- Sound is synthesized locally after interaction. No external analytics, multiplayer, or messages.

## Dependencies

Three.js 0.186.1, vendored under `lib/vendor/`; license at `public/vendor/THREE-LICENSE.txt`. Vinext/React/Cloudflare Sites starter dependencies are in package-lock.json. The interface uses DM Sans and Noto Sans KR from Google Fonts with system fallbacks.

## Verification

`npx tsc --noEmit`; `node --test tests/session.test.mjs` (optional server); static production build; browser checks of wrong/correct entry code, game loading under `/stress/`, destruction, undo, rebuild and locking. The original server version was also checked for login, logout and throttling.
