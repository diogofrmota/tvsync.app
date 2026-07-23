# TvSync UX implementation status

Audit date: 2026-07-22 (independent re-audit; supersedes the prior version of this document)

Authority: [`UX.md`](UX.md) is the authoritative product and user-experience specification. Where the application disagreed with it, `UX.md` was treated as correct and the implementation was corrected to match.

## Method for this pass

This pass explicitly did **not** trust any previous version of this document. Two layers of verification were used:

1. **Static/code-level audit.** Four parallel deep-read passes covered: (1) public/auth pages + Home + Header/Footer, (2) Movies/TV Shows/Search, (3) Profile/Edit Profile/Social, (4) Movie/TV/Season/Episode detail pages + Footer legal/Contact pages, each cross-checking literal `UX.md` wording against actual source with file/line evidence. A fifth, manual pass covered cross-cutting authorization/security (session-scoped database access, NextAuth configuration, open-redirect protection, rate limiting).
2. **Live, browser-driven testing against a real stack.** Rather than stopping at "no live credentials are available," this pass stood up a genuine local backing stack so the actual application (a real production build, not a mock) could be exercised end-to-end in a real Chromium browser:
   - **Real Postgres**: PostgreSQL 16 (already present on the host) with every migration in `database/migrations` applied in order, used as the app's real datastore.
   - **A protocol shim so the app's real Neon HTTP driver (`@neondatabase/serverless`) could reach that local Postgres.** The app calls `neon(DATABASE_URL)`, which only speaks Neon's proxy-specific HTTP `/sql` protocol, not raw Postgres wire protocol. A small local Node HTTP shim was written that implements that exact contract (raw-text row/field responses matching Neon's `Neon-Raw-Text-Output` contract, including transaction/batch support) against real `pg`. `@neondatabase/serverless`'s `fetchEndpoint` default was pointed at this shim for local testing only. **This was test scaffolding only** — it lived in `/tmp`, touched no file under version control, and every modification made to the installed `node_modules` copy of the package to wire it up was reverted before finishing (`git status` on `node_modules` is not tracked, and the change was verified byte-for-byte reverted).
   - **A TMDB fixture server**, since the sandbox's network policy denies outbound HTTPS to `api.themoviedb.org` (confirmed via the proxy's own status endpoint, which logs `connect_rejected` for that host) — real TMDB access is not merely unconfigured here, it is policy-blocked at the network layer, so no API key would help. A small local HTTP server was written that serves schema-accurate fixture responses (movie/TV detail, seasons, episodes, credits, videos, watch providers, trending/discover/search) for every TMDB endpoint the app calls, with `TMDB_API_URL` pointed at it. This is real request/response traffic through the app's actual TMDB service layer and normalizers — only the upstream data source is a fixture instead of the real TMDB.
   - **A real Chromium browser** (the environment's pre-installed browser, driven via `playwright-core`) was used to click through actual registration, login, library management, search, profile editing, social, and detail-page flows, with console/network/page-error listeners attached throughout.
   - Email delivery (Resend) could not be exercised end-to-end since no real `RESEND_API_KEY`/inbox exists here; verification/reset tokens were instead applied directly via SQL exactly as a clicked email link would (`email_verified_at = now()`), so every *downstream* behavior (blocked-until-verified login, post-verification access, invalid/expired reset-link handling) was still exercised for real. Real Google OAuth's browser consent round-trip was not driven live for the same reason (no real Google client credentials/network access), but every downstream code path (session versioning, identity linking, provider-account conflict handling) was verified by direct source review and the existing PGlite-backed test suite.
   - `pnpm build && pnpm start` (a genuine production build, not `next dev`) was used for all interactive testing after an early false positive was traced to a `next dev`/Turbopack Fast-Refresh WebSocket artifact specific to this sandbox's proxy setup (see "Notes on methodology" below) — production mode reproduced none of that noise.

This live pass **found one additional real defect that the static/code pass and the previous audit both missed**, and — importantly — **caught a regression this session itself introduced while fixing an earlier defect**, before it ever reached the codebase's committed history in a broken state. Both are documented below with the same rigor as pass 1's findings.

## Validation evidence (this pass)

| Check | Result |
| --- | --- |
| `pnpm test` | 154/154 passing (150 pre-existing + 4 new regression assertions added this pass) |
| `pnpm lint` (Biome) | Clean, 0 errors |
| `pnpm type:check` (`tsc --noEmit`, strict mode) | Clean |
| `pnpm build` (Next.js 16.2.6, production, Turbopack) | Successful against both a placeholder-credential environment (matching what CI/Vercel-without-secrets would see) and the local live-testing stack; full route table below |
| `pnpm exec knip` | No new dead code introduced; pre-existing unused-export list unchanged by this pass's diffs |
| Live browser testing | Real Chromium driven via `playwright-core` against `pnpm start` (production build) backed by a real local Postgres and a TMDB fixture server — see Method above and Personas/Routes/Viewports below for what was exercised and what each run proved |

Build was run with placeholder `DATABASE_URL`/`TMDB_API_KEY`/`AUTH_SECRET` values (no live Neon/TMDB/Google credentials exist in this sandbox); every route pre-existing as `ƒ` (dynamic) built successfully. Four routes that were previously statically prerendered (`/privacy`, `/terms`, `/contact`, `/_not-found`) are now `ƒ` (dynamic) as a direct, understood consequence of Defect 1's fix — see that entry for why this trade-off was made deliberately.

## Defects found and fixed this pass

### 1. Header nav and Footer were absent from the initial server-rendered HTML on every signed-out page (real bug, high impact)

**UX.md requirement violated:** 1.1 ("Home / Register / Login" header) and 1.2 ("Footer: Privacy Policy, Terms of Service, Contact, copyright").

**Root cause:** `SessionProvider` (`src/lib/components/ui/provider.tsx`) was never seeded with a server-fetched session. `useSession()` therefore starts at `status === 'loading'` on both the server-rendered pass and initial client hydration, and only resolves after an async client-side `fetch('/api/auth/session')` completes. `Header.tsx:163` renders no nav at all while `status === 'loading'`, and `layout/index.tsx:43` renders no `<Footer />` in that state either.

**Fix:** `src/app/layout.tsx` now calls `getServerSession(authOptions)` in the (now async) root Server Component and passes the result into `<Provider session={session}>`, which forwards it to `<SessionProvider session={session}>`.

**Verified twice:** first via `curl` against a `pnpm build && pnpm start` response (placeholder credentials); then again, more thoroughly, against the full live stack — every one of the ~15 live browser sessions in this pass loaded `/` and other signed-out pages and confirmed the header nav and footer were present in the very first paint, with no pop-in.

**Documented trade-off:** because the root layout now calls `getServerSession` (a per-request/cookie-dependent read), Next.js can no longer statically prerender any route under it. `/privacy`, `/terms`, `/contact`, and `/_not-found` (previously static `○`) are now dynamic `ƒ` routes. This is an accepted, deliberate cost — every route already shared the same global header/footer chrome, so correctness of that chrome outweighs prerendering those four pages.

### 2. TV library could display "Watching" with zero watched episodes for zero/one-episode shows (real bug, narrow edge case)

**UX.md requirement violated:** 2.2 — "Watching: TV shows with **at least one watched episode** that are not fully completed."

**Fix:** Removed the `intentStatus === WatchStatus.Watching` fallback from `deriveTvLibraryStatus` (`src/lib/features/library/tv-library-state.ts`), so Watching strictly requires `watchedEpisodeCount > 0`, and updated `getOptimisticTvLibraryProjection` to resolve to Planned instead for shows with ≤1 available episode.

**Regression tests added:** `tests/tv-library-ux.test.ts`.

### 3. Unlabeled, invisible close button in the Delete Account confirmation dialog (accessibility defect)

**Fix:** `src/lib/pages/profile/profile-form.tsx` now uses `<Dialog.CloseTrigger asChild><CloseButton disabled={isPending} size="sm" /></Dialog.CloseTrigger>`, giving it both a visible × icon and a default `aria-label="Close"`.

**Live-verified this pass:** the Delete Account flow was driven end-to-end in a real browser three times (empty confirmation blocked, wrong confirmation text blocked with a field error, correct username+password genuinely deleting the row from Postgres) — the dialog and its controls, including the fixed close button, were exercised as real, rendered UI, not just source-reviewed.

### 4. Contact/auth per-IP rate limiting was bypassable via a spoofed `X-Forwarded-For` header (security hardening)

**Fix:** Extracted the parsing logic into a pure helper `parseTrustedClientIp` (`src/lib/services/auth/security.ts`) that trusts the right-most (nearest-trusted-hop) entry instead of the client-suppliable left-most one; `getClientIp` (`src/lib/services/auth/rate-limit.server.ts`) now delegates to it.

**Regression test added:** `tests/auth-security.test.ts`.

### 5. Broken/unreachable poster images showed the browser's native broken-image icon instead of the app's own "Poster unavailable" fallback (real bug, found only through live browser testing)

**Why static review missed this:** `PosterImage.tsx` already had a fallback path — but only for the case where no `src` was supplied at all (`if (!src) { …show fallback… }`). A `src` that is present but fails to load over the network (a real, common production scenario: a stale/removed TMDB image path, a transient CDN failure, or — as directly observed in this sandbox — the network policy blocking `image.tmdb.org` outright) fell through to a plain `<Image src=… />` with no `onError` handling, so the browser rendered its own default broken-image glyph. This is invisible to a source-only read because the component *looks* like it handles "no poster," and only differs from the required behavior when an image genuinely fails to load at runtime.

**How it was found:** a live screenshot of `/tv-shows` for a real seeded TV-show row (posters intentionally unreachable in this sandbox, exactly mirroring a real TMDB outage or stale path) showed the native browken-image icon next to the alt text, not the "Poster unavailable" box used everywhere else.

**Fix:** `src/lib/components/shared/PosterImage.tsx` now tracks a `failedToLoad` state via the `<Image>`'s `onError` handler and renders the same "Poster unavailable" fallback box for both cases (`if (!src || failedToLoad)`).

**Regression test added:** `tests/movie-library-ux.test.ts` — asserts the failure-state tracking and the `onError` wiring exist in source (matching this repo's established source-contract test style, since no DOM-rendering test harness is present).

**Live-verified:** after the fix, a fresh screenshot of the same Home page (36 fixture posters, all genuinely unreachable in this sandbox) showed the styled "Poster unavailable" box on every single card, with no native broken-image icons anywhere.

### 6. Self-introduced regression, caught and fixed before being reported as done: fixing Defect 5 broke cast/streaming-provider images on Server Components

**What happened:** the fix for Defect 5 added `'use client'` to `PosterImage.tsx` (required, since it now needs `useState`). That file also happened to export two plain string constants, `IMAGE_URL`/`IMAGE_URL_ORIGINAL`, used by several **Server Components** (cast lists, streaming-provider logos, episode stills, the movie image gallery, the search suggestion dropdown). Once a module carries `'use client'`, Next.js's server/client reference boundary treats **every** export from it as a client reference — including plain constants — so a Server Component importing `IMAGE_URL` no longer got the real string; it got a throwing stub, and the resulting broken URL (the stub's stringified source, literally embedded in the `<img src>`) was requested and 404'd.

**How it was found:** *only* through live browser testing — this class of bug produces valid TypeScript, a clean `pnpm build`, and passing existing tests, since nothing in the type system or the source-contract test suite modeled the Next.js server/client boundary's runtime behavior for re-exported constants. It surfaced as real `404`s in the browser's network panel with an unmistakable URL: `.../function()%7Bthrow%20Error(%22Attempted%20to%20call%20IMAGE_URL()%20from%20the%20server...`.

**Fix:** extracted `IMAGE_URL`/`IMAGE_URL_ORIGINAL` into a new, plain (non-`'use client'`) module, `src/lib/components/shared/tmdb-image-urls.ts`, and updated every consumer (`PosterImage.tsx` and the 8 Server Components that used the constants directly) to import from it instead.

**Regression test added:** `tests/movie-library-ux.test.ts` — asserts the constants module never carries `'use client'`, that `PosterImage.tsx` doesn't re-declare/export them, and that every known server-side consumer imports from the shared module rather than from the client-boundary file. This guards specifically against this exact class of regression recurring.

**Verified:** after the fix, a live re-run of the exact browser session that had produced the `404`s showed zero `404`s, and direct DOM inspection confirmed cast/provider images now resolve to real `https://image.tmdb.org/...` URLs.

## Notes on methodology (things ruled out, not reported as defects)

Several observations during live testing looked like defects at first and were run down before being ruled out — recorded here so the audit trail is honest about dead ends, not just successes:

- **A native, unprevented GET form submission with the password in the URL** was observed once during `next dev` testing. Root-caused to this sandbox's proxy blocking the Next.js dev server's HMR WebSocket handshake (`Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from "127.0.0.1"`), which is a `next dev`/Turbopack Fast-Refresh-only code path. Retested identically against a `pnpm build && pnpm start` production server: the login form's `event.preventDefault()` worked correctly every time (confirmed by request-log capture showing no navigation, only a same-page `401`). All further interactive testing in this pass used the production build for this reason.
- **The horizontally-scrollable profile statistics rail appeared completely blank on a `fullPage` mobile screenshot.** Direct DOM inspection (`getBoundingClientRect`, computed styles) showed all 5 cards genuinely present, correctly sized, and `visibility: visible`; a normal (non-`fullPage`) viewport screenshot scrolled to the rail showed it rendering correctly. This was a Playwright `fullPage` screenshot-compositing artifact specific to elements with their own independent horizontal scroll container, not an app defect.
- **The video trailer `<iframe>` appeared to render nothing.** Confirmed via DOM query that the `<iframe>` element was present with the correct `src` (`https://www.youtube-nocookie.com/embed/<key>`) and correct 960×540 (16:9) dimensions — the embedded player simply can't load in this sandbox because the network policy also blocks `youtube-nocookie.com`, and the resulting black frame is visually indistinguishable from the page's own black background in a screenshot. Not an app defect; the trusted-trailer selection and embed logic (`selectTrustedTvTrailer`, `TvTrailer`) work correctly.
- **A follower did not appear on a public profile's Followers page.** The follow relationship was confirmed to exist in the database; the follower's own profile was still `private`, and `LIST_VISIBLE_FOLLOWERS_QUERY` intentionally excludes non-public followers from someone else's public followers list (protecting the *follower's* privacy choice, not a bug in Alice's page). Re-verified by making the follower's profile public and confirming they then appeared correctly.
- **Contact form submission showed a generic failure message.** Expected and correct: no `RESEND_API_KEY` is configured in this sandbox, so delivery genuinely cannot succeed; the code path correctly caught the delivery failure and returned the generic, non-leaking `GENERIC_FAILURE_MESSAGE` rather than crashing or exposing provider error detail — this is itself positive evidence the failure path is handled correctly.

## Personas verified this pass (live, browser-driven, against real Postgres)

| # | Persona | Evidence |
| --- | --- | --- |
| 1 | Public visitor | Home, Privacy, Terms, Contact, Login, Register, Forgot Password all loaded and rendered correct signed-out chrome across all 5 viewports with no console errors beyond expected sandbox network-policy noise (TMDB/YouTube domains blocked) |
| 2 | Registered user, unverified email | Real registration created a DB row with `email_verified_at IS NULL`; login attempt correctly blocked with a "verify your email" message and a working Resend-verification control; login succeeded and redirected to `/profile` immediately after verification |
| 3 | Verified email/password user, empty library | `/movies`, `/tv-shows`, and `/profile` all rendered correct empty-state messaging and the exact required stat-card labels with zero values |
| 4 | Verified user with movies/TV shows in every status | Added a movie via Search's quick-add, moved it Planned → Finished on `/movies` (persisted across reload); added a TV show, moved it Planned → Watching → Finished on `/tv-shows` (persisted across reload each time); favourite-toggled a movie (persisted to `favorite_media`) |
| 5 | Google-authenticated user | Not driven live end-to-end (no real Google OAuth credentials/network access in this sandbox — see Blockers). The `signIn` callback, identity-linking, and session-versioning logic were verified by direct source review and the existing PGlite-backed `tests/auth-*` suite, which exercises the same database functions (`ensureGoogleAuthIdentity`, `getSessionVersion`) against a real ephemeral Postgres instance |
| 6 | User with followers and following | Two real accounts created; one followed the other live (persisted to the `follows` table); each side's Followers/Following pages, search-within-list, and Follow/Unfollow controls were exercised and confirmed correct, including the privacy-filtering behavior described above |
| 7 | Another user viewing a public profile | Confirmed the profile viewer sees display name/username/bio/Follow button/counts/statistics/favourites and does **not** see the profile owner's email address anywhere in the rendered page |
| 8 | User with partially watched TV shows | The Planned → Watching transition (persona 4's TV show) is the "≥1 episode watched, not complete" case required by UX.md 2.2, confirmed via both the library page and a direct episode-level Mark-Watched action rolling up to partial progress on the detail page |
| 9 | User with completed TV shows | The Watching → Finished transition (persona 4's TV show) confirmed via both the library page and the season/episode "Mark season watched" controls |
| 10 | Invalid/expired reset-password link | `/reset-password?token=<garbage>` correctly rendered the "invalid, expired, or already used" message with a working "Request a new reset link" control |

Additional interactions verified live beyond the persona list: episode-level Mark Watched/Unwatched with DB-persisted state and show-level progress rollup; Change Password (old password required, new password takes effect immediately, session invalidated and re-login with the new password succeeds); Delete Account (empty confirmation blocked by native validation, wrong confirmation text blocked with a field error and no deletion, correct confirmation genuinely and permanently deletes the row); Contact form submission (correct generic failure shown when delivery is unavailable, as expected in this sandbox).

## Routes and viewports tested

**Viewports** (all via real browser `viewport` resize, checked for `scrollWidth > clientWidth` horizontal-overflow at each): narrow mobile (320×690), common mobile (390×844), tablet (820×1180), desktop (1280×900), wide desktop (1920×1080). No horizontal overflow was found on Home, Search, Movies, TV Shows, or Profile at any tested width. Mobile bottom navigation was confirmed pinned near the bottom of the viewport on common-mobile. Desktop Home confirmed a genuine one-row-of-9 grid per section; mobile confirmed 3 columns.

**Routes exercised live** (production build, real Postgres, TMDB fixture server): `/`, `/register`, `/login`, `/forgot-password`, `/reset-password` (valid-shape and invalid-token cases), `/privacy`, `/terms`, `/contact`, `/movies`, `/tv-shows`, `/search?type=movie`, `/search?type=tv`, `/profile`, `/profile/edit`, `/tv/show/[id]`, `/tv/show/[id]/season/[n]`, `/tv/show/[id]/season/[n]/episode/[n]`, `/movie/[id]`, `/profile/[username]`, `/profile/[username]/followers`, `/profile/[username]/following`.

**Routes verified only by static/code review** (not live-rendered, since they require real TMDB search-provider data or Google's live consent screen beyond what a fixture server can meaningfully stand in for): the Google OAuth redirect/consent/callback round trip itself; `/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]`, `/person/[id]` (all exercise the identical TMDB service layer already proven live via the routes above, so the residual risk is low, but they were not individually clicked through).

## Route inventory (current, verified)

| Route | Access | UX.md section | Status |
| --- | --- | --- | --- |
| `/` | Public; signed-in redirects to `/movies` | 1.2 | Complete — live-verified |
| `/register` | Public | 1.3 | Complete — live-verified |
| `/login` | Public | 1.4 | Complete — live-verified |
| `/forgot-password` | Public | 1.5 | Complete — live-verified (form + validation; delivery blocked by missing `RESEND_API_KEY` in this sandbox, see Blockers) |
| `/reset-password` | Public, token-bound | 1.6 | Complete — live-verified, including invalid-token persona |
| `/verify-email`, `/verify-email-change` | Public, token-bound | Supports 1.3/2.5 verification flows | Complete — downstream behavior (blocked-until-verified, unlocks after) live-verified; token delivery itself not live (no Resend) |
| `/movies` | Protected | 2.1 | Complete — live-verified, including status transitions |
| `/tv-shows` | Protected | 2.2 | Complete — live-verified, including Defect 2 fix |
| `/search` | Protected | 2.3 | Complete — live-verified for both Movies and TV Shows tabs, quick-add |
| `/profile` | Protected | 2.4 | Complete — live-verified, including Defect 5/6 fixes |
| `/profile/edit` | Protected | 2.5 | Complete — live-verified: profile info save, privacy setting, change password, delete account, all including Defect 3 fix |
| `/movie/[id]` | Public content, protected actions | 2.6 | Complete — live-verified content hierarchy and favourite toggle |
| `/tv/show/[id]` | Public content, protected actions | 2.7 | Complete — live-verified, including Defect 5/6 fixes |
| `/tv/show/[id]/season/[seasonNumber]` | Public content, protected actions | 2.8 | Complete — live-verified |
| `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]` | Public content, protected actions | 2.9 | Complete — live-verified, including Mark Watched persistence and rollup |
| `/profile/[username]` | Public for public profiles | 3.1 | Complete — live-verified, including no-email-leak check |
| `/profile/[username]/followers`, `/profile/[username]/following` | Public for public profiles, actions protected | 3.2 | Complete — live-verified with two real accounts |
| `/privacy` | Public | 4.1 | Complete (content flagged for legal review, see below) |
| `/terms` | Public | 4.2 | Complete (content flagged for legal review, see below) |
| `/contact` | Public | 4.3 | Complete — live-verified form + spam/rate-limit hardening (Defect 4) |
| `/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]` | Public | Supporting — "See All" destinations from Home | Kept, in scope; static review only |
| `/person/[id]` | Public | Supporting — cast/similar-title destination | Kept, in scope; static review only |
| `/watchlist` | Protected, unlinked from navigation | Legacy | Intentionally kept out of primary navigation per `AGENTS.md` |
| `/movie/[id]/images` | Public, `noindex,nofollow` | Not in `UX.md` | Kept only because `tests/cache-safety.test.ts` asserts its contract; unreachable from any page |
| `/api/diagnostics/profile` | Protected API route | Not in `UX.md` | Internal diagnostic endpoint (auth-config booleans, own username only), unlinked from any UI. Not user-facing; no private data beyond the caller's own username is exposed |

## 1. Non-Logged-In Users

### 1.1 Header — Complete (Defect 1 fixed, live-verified)
### 1.2 Home page — Complete (Defect 1 fixed, live-verified across 5 viewports)
### 1.3–1.6 Auth pages — Complete, live-verified (registration, unverified-login block, verified-login unlock, invalid reset-token persona)

## 2. Logged-In Users

### Logged-in header — Complete, live-verified (desktop nav order + mobile bottom nav pinned)
### 2.1 Movies — Complete, live-verified (quick-add via Search, status transition, persistence across reload)
### 2.2 TV Shows — Complete (Defect 2 fixed), live-verified (status transitions Planned→Watching→Finished, persistence)
### 2.3 Search — Complete, live-verified (Movies/TV tabs, quick-add, browsing without a query)
### 2.4 Profile / 2.5 Edit Profile — Complete (Defect 3 fixed), live-verified (stat rail, favourites, privacy setting, change password with re-login, delete account with all three confirmation-gate cases)
### 2.6–2.9 Movie/TV/Season/Episode pages — Complete (Defects 5/6 fixed), live-verified (full content hierarchy, episode Mark Watched with DB persistence and progress rollup, trailer embed presence, cast/provider images)
### 3.1/3.2 Public profile, Followers/Following — Complete, live-verified with two real accounts including privacy-filtering behavior

## 4. Footer Pages — Complete (Defect 4 hardening applied to Contact), live-verified

4.1 Privacy and 4.2 Terms cover every required bullet with concrete, product-specific content; legal placeholders are explicitly flagged in-page for owner review rather than fabricated. 4.3 Contact has exactly the required fields, a real success-path UI, and genuinely server-side spam protection/rate limiting (now hardened against IP spoofing per Defect 4); the failure path was live-confirmed to degrade safely when mail delivery is unavailable.

## Known accepted deviations (not defects)

- **Profile visibility control** on Edit Profile — required to implement UX.md 3.1's private-profile behavior.
- **`/movie/[id]/images`** stays in the route tree, `noindex,nofollow`, unreachable from any page, kept solely because `tests/cache-safety.test.ts` asserts its dynamic-route/robots contract.
- **`/watchlist`** stays server-protected but unlinked from navigation, per `AGENTS.md`'s documented migration note.
- **`/api/diagnostics/profile`** — an unlinked, auth-gated diagnostic API route exposing only boolean environment-configuration flags and the caller's own username.
- **Legal wording gaps** on `/privacy` and `/terms` (registered business entity, governing law, formal retention schedule, specific legal basis) are explicitly flagged in-page for owner/legal review rather than invented.
- **Four routes are now dynamically rendered instead of statically prerendered** (`/privacy`, `/terms`, `/contact`, `/_not-found`) as a direct, deliberate consequence of fixing Defect 1.

## External configuration still required (genuine blockers, not fixable by code)

These cannot be closed out from within this environment and are not claimed as resolved:

- **`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`** — no real Google OAuth app credentials exist here, and this sandbox's network policy does not provide a path to Google's OAuth endpoints for a live consent-screen round trip. The Google-authenticated persona was verified only by source review + the existing PGlite-backed auth test suite, not a live browser OAuth flow.
- **`RESEND_API_KEY`/`CONTACT_EMAIL_TO`/`AUTH_EMAIL_FROM`** — no real Resend account is configured; verification emails, password-reset emails, email-change confirmations, and Contact form delivery could not be sent or received live. Every downstream code path that doesn't require an actual delivered email was still exercised live (see Personas table).
- **`TMDB_API_KEY`** — even if a real key were supplied, this sandbox's network policy denies outbound HTTPS to `api.themoviedb.org` (and to `image.tmdb.org`, `www.youtube-nocookie.com`) at the proxy level, confirmed via the proxy's own status/diagnostics endpoint. A schema-accurate local fixture server was used instead to drive real end-to-end interaction through the actual TMDB service layer and page code; this proves the application logic is correct, but does not substitute for a final smoke test against real, live TMDB data and real poster/backdrop/trailer network loads before production sign-off.
- **A real Neon Postgres instance** — production deployment must still be verified once against the actual Neon database (this pass used a local PostgreSQL 16 instance with the same migrations applied, which validates the SQL/schema contract but not Neon-specific behavior such as connection pooling limits or cold-start latency).

## Legal text requiring owner review

Unchanged from prior review: `/privacy` and `/terms` both carry an explicit in-page "Legal review" section flagging the registered business entity name, governing law/jurisdiction, formal data-retention schedule, and specific legal basis for processing as unresolved placeholders requiring the site owner's/counsel's input, rather than inventing any of these.

## Manual verification still required before production sign-off

- A real Google OAuth sign-in/sign-up round trip against production `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and the live callback URL.
- Real verification/reset/email-change/Contact emails actually arriving via Resend, including spam-folder/deliverability checks.
- A smoke test against real TMDB data for poster/backdrop/trailer/streaming-provider rendering (this pass's fixture server proves the code paths work; it cannot prove real TMDB's actual current response shapes match assumptions beyond the documented types).
- A pass against the real Neon Postgres instance to rule out any Neon-specific connection-pooling or latency behavior not observable against a local Postgres.

## Status definitions

| Status | Meaning |
| --- | --- |
| **Complete — live-verified** | Verified against the exact wording of `UX.md` in this pass via a real browser interacting with a real (locally-backed) running instance of the application, not just source review. |
| **Complete** | Verified against the exact wording of `UX.md` via source review and/or the automated test suite; not separately driven live in a browser this pass. |
| **Fixed this pass** | A real discrepancy was found and corrected during this pass; verified complete afterward per the evidence cited for that defect. |
| **Accepted as necessary / Known accepted deviation** | A minimal, documented deviation required to make an explicitly-specified requirement actually work, or an existing route/behavior judged in-scope but not a UX.md-defined feature. |
