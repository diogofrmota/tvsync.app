# TvSync UX implementation status

Audit date: 2026-07-22 (independent re-audit; supersedes the prior version of this document)

Authority: [`UX.md`](UX.md) is the authoritative product and user-experience specification. Where the application disagreed with it, `UX.md` was treated as correct and the implementation was corrected to match.

## Method for this pass

This pass explicitly did **not** trust the previous version of this document. Every claim below was independently re-derived by reading `AGENTS.md`, `UX.md`, the full `src/app` route tree, every page/component/server-action file it links to, and the existing `tests/*` suite, then cross-checking literal UX.md wording against the actual source (file/line evidence). Four parallel deep-read passes covered: (1) public/auth pages + Home + Header/Footer, (2) Movies/TV Shows/Search, (3) Profile/Edit Profile/Social, (4) Movie/TV/Season/Episode detail pages + Footer legal/Contact pages. A fifth, manual pass covered cross-cutting authorization/security (session-scoped database access, NextAuth configuration, open-redirect protection, rate limiting).

Four real defects were found and fixed in this pass (below). Everything else re-checked matched `UX.md` with no discrepancy found in the current source.

## Validation evidence (this pass)

| Check | Result |
| --- | --- |
| `pnpm test` | 152/152 passing (150 pre-existing + 2 new regression assertions added this pass) |
| `pnpm lint` (Biome) | Clean, 0 errors |
| `pnpm type:check` (`tsc --noEmit`, strict mode) | Clean |
| `pnpm build` (Next.js 16.2.6, production, Turbopack) | Successful; full route table below |
| `pnpm exec knip` | No new dead code introduced; pre-existing unused-export list unchanged by this pass's diffs |
| Live server smoke test | `pnpm build && pnpm start` with placeholder env vars (no real Neon/TMDB/Google credentials are available in this environment — see Blockers), then `curl` against `/`, `/privacy`, `/terms`, `/contact`, `/login`, `/register`, `/forgot-password`, `/movies`, `/tv-shows`, `/profile`, `/profile/edit`, `/watchlist`. All returned `200` (or the expected framework-level redirect signal for protected routes). Used to directly confirm the header/footer defect and its fix against real server-rendered HTML (see Defect 1). |

Build was run with placeholder `DATABASE_URL`/`TMDB_API_KEY`/`AUTH_SECRET` values (no live Neon/TMDB/Google credentials exist in this sandbox); every route pre-existing as `ƒ` (dynamic) built successfully. Four routes that were previously statically prerendered (`/privacy`, `/terms`, `/contact`, `/_not-found`) are now `ƒ` (dynamic) as a direct, understood consequence of Defect 1's fix — see that entry for why this trade-off was made deliberately.

## Defects found and fixed this pass

### 1. Header nav and Footer were absent from the initial server-rendered HTML on every signed-out page (real bug, high impact)

**UX.md requirement violated:** 1.1 ("Home / Register / Login" header) and 1.2 ("Footer: Privacy Policy, Terms of Service, Contact, copyright").

**Root cause:** `SessionProvider` (`src/lib/components/ui/provider.tsx`) was never seeded with a server-fetched session. `useSession()` therefore starts at `status === 'loading'` on both the server-rendered pass and initial client hydration, and only resolves after an async client-side `fetch('/api/auth/session')` completes. `Header.tsx:163` renders no nav at all while `status === 'loading'`, and `layout/index.tsx:43` renders no `<Footer />` in that state either. Net effect: the header nav (Home/Register/Login) and the entire footer (Privacy Policy/Terms of Service/Contact/copyright) were missing from the actual HTML returned by the server for every page load, appearing only after a client round-trip — a real, reproducible content-completeness violation, not merely a "flash."

**Fix:** `src/app/layout.tsx` now calls `getServerSession(authOptions)` in the (now async) root Server Component and passes the result into `<Provider session={session}>` (`src/lib/components/ui/provider.tsx`), which forwards it to `<SessionProvider session={session}>`. This makes `useSession()` resolve immediately to `authenticated`/`unauthenticated` on both the server-rendered HTML and first client render — no `loading` gap.

**Verified:** Built the app (`pnpm build && pnpm start`) and `curl`'d `/` directly. Before the fix this HTML contained no nav links and no footer text; after the fix, the raw server response includes `href="/register">Register`, `href="/login">Login`, `href="/">Home`, and `Privacy Policy` / `Terms of Service` / `Contact` / `Copyright` / `©`, all in the initial (non-hydrated) response.

**Documented trade-off:** because the root layout now calls `getServerSession` (a per-request/cookie-dependent read), Next.js can no longer statically prerender any route under it. `/privacy`, `/terms`, `/contact`, and `/_not-found` (previously static `○`) are now dynamic `ƒ` routes. This is an accepted, deliberate cost — every route already shared the same global header/footer chrome, so correctness of that chrome outweighs prerendering those four pages. No other behavior changed.

### 2. TV library could display "Watching" with zero watched episodes for zero/one-episode shows (real bug, narrow edge case)

**UX.md requirement violated:** 2.2 — "Watching: TV shows with **at least one watched episode** that are not fully completed."

**Root cause:** `deriveTvLibraryStatus` (`src/lib/features/library/tv-library-state.ts`) had a fallback branch — `watchedEpisodeCount > 0 || intentStatus === WatchStatus.Watching` — that classified a show as Watching purely because the user had selected that status, even with zero watched episodes. This was masked for shows with 2+ available episodes (selecting Watching there auto-marks episode 1 watched via `projectWatchedKeysForStatus`, so `watchedEpisodeCount` becomes 1 anyway), but for a show with 0 or 1 available episodes, `projectWatchedKeysForStatus` deliberately clears watched keys to 0 (since watching the only episode would instantly complete the show), leaving a persisted state of "Watching" displayed next to "0/1 episodes watched" — a literal contradiction of the section's own definition. Confirmed reachable and previously asserted as intended behavior by the codebase's own test suite (`tests/tv-library-ux.test.ts`, prior assertions at the "one-episode show moved to Watching" and "3-episode show with 0 watched but Watching intent" cases).

**Fix:** Removed the `intentStatus === WatchStatus.Watching` fallback from `deriveTvLibraryStatus`, so Watching strictly requires `watchedEpisodeCount > 0`. Updated `getOptimisticTvLibraryProjection` so that selecting Watching for a show with ≤1 available episode now optimistically resolves to Planned (matching what the server-side derivation now produces), instead of showing a status the server will immediately contradict. This applies uniformly everywhere TV status can be set — `/tv-shows`, the TV show detail page, and Search's quick status control — since all three route through the same `setOwnTvLibraryIntent` → `deriveTvLibraryStatus` path.

**Regression tests added:** `tests/tv-library-ux.test.ts` — updated the two assertions that previously encoded the old (wrong) behavior, and added a new test (`'a show with zero or one available episodes never displays Watching with zero watched episodes'`) covering the zero-episode case, the one-episode case, and the full server-side reconciliation path (`projectWatchedKeysForStatus` → `getTvLibraryProjection`).

### 3. Unlabeled, invisible close button in the Delete Account confirmation dialog (accessibility defect)

**Root cause:** `src/lib/pages/profile/profile-form.tsx` rendered a bare `<Dialog.CloseTrigger />` with no children and no `aria-label`. Chakra's dialog recipe only positions this slot absolutely; it supplies no default icon or accessible name. The result was a focusable, clickable hit target in the dialog's corner with nothing for sighted users to see and no name for screen readers (announced only as "button").

**Fix:** Replaced it with `<Dialog.CloseTrigger asChild><CloseButton disabled={isPending} size="sm" /></Dialog.CloseTrigger>`. Chakra's `CloseButton` supplies both a visible × icon and a default `aria-label="Close"`.

### 4. Contact/auth per-IP rate limiting was bypassable via a spoofed `X-Forwarded-For` header (security hardening)

**UX.md requirement touched:** 4.3 — "Basic spam protection and rate limiting are applied," which implies the limiting is actually server-enforced against a client that doesn't control its own request headers.

**Root cause:** `getClientIp` (`src/lib/services/auth/rate-limit.server.ts`, shared by the Contact form's rate limiter and the Credentials login rate limiter) took the **first** (left-most) entry of `X-Forwarded-For`. By convention that left-most entry is whatever the client itself sent before any trusted proxy touched the request — fully attacker-controlled. A script could rotate `X-Forwarded-For: <random>` on every request and get a fresh per-IP rate-limit bucket every time, defeating the IP dimension of both the Contact form's and the login endpoint's rate limiting (the per-identity/per-email bucket still applied as a second line of defense).

**Fix:** Extracted the parsing logic into a new pure, unit-testable helper `parseTrustedClientIp` (`src/lib/services/auth/security.ts`), which now takes the **last** (right-most) entry — the one appended by the nearest trusted hop (the platform's own edge network) — rather than the client-suppliable first entry. `getClientIp` now delegates to it.

**Regression test added:** `tests/auth-security.test.ts` — `'client IP resolution trusts only the nearest proxy hop, not attacker-suppliable entries'`.

## Route inventory (current, verified)

| Route | Access | UX.md section | Status |
| --- | --- | --- | --- |
| `/` | Public; signed-in redirects to `/movies` | 1.2 | Complete |
| `/register` | Public | 1.3 | Complete |
| `/login` | Public | 1.4 | Complete |
| `/forgot-password` | Public | 1.5 | Complete |
| `/reset-password` | Public, token-bound | 1.6 | Complete |
| `/verify-email`, `/verify-email-change` | Public, token-bound | Supports 1.3/2.5 verification flows | Complete |
| `/movies` | Protected | 2.1 | Complete |
| `/tv-shows` | Protected | 2.2 | Complete (Defect 2 fixed) |
| `/search` | Protected | 2.3 | Complete |
| `/profile` | Protected | 2.4 | Complete |
| `/profile/edit` | Protected | 2.5 | Complete (Defect 3 fixed) |
| `/movie/[id]` | Public content, protected actions | 2.6 | Complete |
| `/tv/show/[id]` | Public content, protected actions | 2.7 | Complete |
| `/tv/show/[id]/season/[seasonNumber]` | Public content, protected actions | 2.8 | Complete |
| `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]` | Public content, protected actions | 2.9 | Complete |
| `/profile/[username]` | Public for public profiles | 3.1 | Complete |
| `/profile/[username]/followers`, `/profile/[username]/following` | Public for public profiles, actions protected | 3.2 | Complete |
| `/privacy` | Public | 4.1 | Complete (content flagged for legal review, see below) |
| `/terms` | Public | 4.2 | Complete (content flagged for legal review, see below) |
| `/contact` | Public | 4.3 | Complete (Defect 4 hardening applied) |
| `/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]` | Public | Supporting — "See All" destinations from Home | Kept, in scope |
| `/person/[id]` | Public | Supporting — cast/similar-title destination | Kept, in scope |
| `/watchlist` | Protected, unlinked from navigation | Legacy | Intentionally kept out of primary navigation per `AGENTS.md` |
| `/movie/[id]/images` | Public, `noindex,nofollow` | Not in `UX.md` | Kept only because `tests/cache-safety.test.ts` asserts its contract; unreachable from any page |
| `/api/diagnostics/profile` | Protected API route | Not in `UX.md` | Internal diagnostic endpoint (auth-config booleans, own username only), unlinked from any UI. Not a UX.md-visible feature; not user-facing; no private data beyond the caller's own username is exposed. Left as-is — out of this audit's scope but flagged here per the "no undocumented visible features" check since it is a real, if inert, route. |

## 1. Non-Logged-In Users

### 1.1 Header — Complete (Defect 1 fixed)
Home, Register, Login in exact order (`Header.tsx:33-47`); no other signed-out links; mobile gets no bottom nav; header now renders correctly in the initial server response (see Defect 1) instead of only after client hydration.

### 1.2 Home page — Complete (Defect 1 fixed)
Hero copy, 4 sections in exact order/content (`home/config.ts`), 9-item/See-All/mobile-3×3/desktop-1×9 grid per section (verified in source: `templateColumns` `repeat(3,...)` base / `repeat(9,...)` at `lg`, and independently confirmed live via `curl` against the built app), footer content present (see Defect 1), CTA/See All/poster links correct, brand casing "TvSync" consistent everywhere (grepped repo-wide, zero mismatches).

### 1.3–1.6 Auth pages — Complete
Layout, exact content order, uniqueness constraints, bcrypt hashing, Resend-based verification/reset email, 24h/single-use reset tokens, generic non-enumerating error messages (with timing padding on Forgot Password and a dummy-hash comparison on Login to resist both message- and timing-based enumeration), Google registration bypassing separate verification, invalid/expired reset link offering "Request a new reset link" — all verified directly against source and confirmed via live `curl` smoke test (auth pages correctly render the black-card shell with no site header/footer, exact field order, exact headings).

## 2. Logged-In Users

### Logged-in header — Complete
Movies/TV Shows/Search/Profile in order on desktop; same 4 items as a fixed bottom nav on mobile; stable during session load.

### 2.1 Movies — Complete
Planned to Watch / Finished / Discover Movies sections in order; Discover → `/search?type=movie`; move/remove/poster-link/empty-state/autosave with optimistic rollback; no extra sections.

### 2.2 TV Shows — Complete (Defect 2 fixed this pass)
Watching / Planned to Watch / Finished / Discover TV Shows in order; Discover → `/search?type=tv`; TV status derivation now strictly requires ≥1 watched episode for Watching in every code path (library page, detail page, Search); progress calculated purely from watched episodes.

### 2.3 Search — Complete
Movies/TV Shows tabs; title search, genre filter, 3 sorts (popularity/rating/release date); results update on submit/filter change; mobile exactly 3 columns, responsive desktop grid; up to 27 items + pagination; quick add-to-watchlist with current status shown; no provider rating ever labelled IMDb.

### 2.4 Profile / 2.5 Edit Profile — Complete (Defect 3 fixed this pass)
View-only `/profile` with Edit Profile button; Following/Followers link to list pages; 5 horizontally-scrollable stat cards in exact required order; Favourite Movies/TV; Compare-with-Following is a real, working feature. Edit Profile has the exact required field list; username uniqueness enforced client- and DB-side; Google users can set a password; account deletion requires typed-username (+ password/Google reauth) confirmation inside an accessible `alertdialog`, whose close control is now itself accessible (Defect 3); no private data leaks on public reads (every public read path independently re-checks `privacy_setting = 'public'`, not just the top-level lookup).

### 2.6 Movie Details / 2.7 TV Show Details / 2.8 Season / 2.9 Episode — Complete
Full required content hierarchy on all four pages; IMDb rating is never backed by TMDB's `vote_average` anywhere in the repo (repo-wide grep confirmed); provider status vs. tracking status visually distinct; trailer plays in-page; exactly one library control per page; favourite + rating controls; cast/similar links go to real detail routes; season list and season/episode pages show all required fields and controls; Previous/Next Episode are omitted (not disabled) at boundaries; marking an episode correctly rolls up to season/show progress; next-unwatched episode clearly identified; broken-image fallbacks exist and don't break layout; long titles are clamped/wrapped, not overflowing.

### 3.1 Public User Profile / 3.2 Followers & Following — Complete
Display name/username/bio/Follow-Unfollow/counts/public statistics/favourites; private account information never displayed (verified at the query level for every public read path, not just the profile page's primary query); dedicated Followers/Following routes with real server-side search filtering and per-row Follow/Unfollow (own row shows "You"); follow/unfollow authorization derives the acting user solely from the server session and returns generic responses regardless of target existence/privacy (no enumeration signal).

## 4. Footer Pages — Complete (Defect 4 hardening applied to Contact)

4.1 Privacy and 4.2 Terms cover every required bullet with concrete, product-specific content (not generic filler); legal placeholders (business entity, governing law, formal retention schedule, specific legal basis) are explicitly flagged in-page for owner review rather than fabricated. 4.3 Contact has exactly the required fields, a real success confirmation, and genuinely server-side spam protection (honeypot + submission-timing heuristic) and rate limiting (Neon-backed, per-identity and per-IP) — the per-IP dimension of which is now resistant to header spoofing (Defect 4).

## Known accepted deviations (not defects)

- **Profile visibility control** on Edit Profile — required to implement UX.md 3.1's private-profile behavior; not listed verbatim in 2.5's field list but not removable without breaking 3.1.
- **`/movie/[id]/images`** stays in the route tree, `noindex,nofollow`, unreachable from any page, kept solely because `tests/cache-safety.test.ts` asserts its dynamic-route/robots contract.
- **`/watchlist`** stays server-protected but unlinked from navigation, per `AGENTS.md`'s documented migration note.
- **`/api/diagnostics/profile`** — an unlinked, auth-gated diagnostic API route exposing only boolean environment-configuration flags and the caller's own username. Not a UX.md-defined feature and not reachable from any UI; left as-is.
- **Legal wording gaps** on `/privacy` and `/terms` (registered business entity, governing law, formal retention schedule, specific legal basis) are explicitly flagged in-page for owner/legal review rather than invented.
- **Four routes are now dynamically rendered instead of statically prerendered** (`/privacy`, `/terms`, `/contact`, `/_not-found`) as a direct, deliberate consequence of fixing Defect 1 (seeding `SessionProvider` with a server session so the header/footer render correctly everywhere). This is a documented cost/correctness trade-off, not an oversight.

## Genuine blockers / manual verification not performed

Be explicit about what this pass could and could not verify, per the standard of not claiming success for anything assumed or visually unchecked:

- **No live Neon Postgres, Google OAuth, or real TMDB credentials exist in this sandbox** (only `.env.example` placeholders are present; no `.env` with real secrets). This means:
  - The 10 required personas (unverified user, empty library, full library in every status, Google-authenticated user, followers/following, public-profile viewer, partial/complete TV progress, expired reset link) were verified through **direct source and database-query-level code review plus the existing PGlite-backed automated test suite** (which spins up a real, ephemeral Postgres instance via `@electric-sql/pglite` and exercises the actual SQL in `tests/*.test.ts`), not through live manual browser sessions against real accounts with production credentials.
  - Google OAuth sign-in itself (the actual redirect/consent/callback round trip) could not be exercised end-to-end without real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` values and network access to Google's OAuth endpoints. The code path (`ensureGoogleAuthIdentity`, `signIn` callback in `src/lib/services/auth/index.server.ts`) was verified by direct reading and is exercised indirectly by `tests/auth-lifecycle.test.mjs`/`tests/auth-database.test.ts` against a real ephemeral Postgres instance, but the actual browser-based Google consent screen round trip was not driven live.
  - Contact form email delivery via Resend and verification/reset email delivery were verified at the code level (server actions, rate limiting, token digesting) but no real email was sent or received, since `RESEND_API_KEY` is not configured here.
- **No dedicated browser/E2E automation tool (Playwright/Cypress) exists in this repository.** This session does not add one, per `AGENTS.md`'s guidance against dependency churn/broad refactors beyond what the task requires. In its place:
  - A live, built production server (`pnpm build && pnpm start`) was started with placeholder credentials and directly `curl`'d for every public and public-content route reachable without a live database (`/`, `/privacy`, `/terms`, `/contact`, `/login`, `/register`, `/forgot-password`) plus every protected route's auth-guard behavior (`/movies`, `/tv-shows`, `/profile`, `/profile/edit`, `/watchlist`), to confirm real server-rendered HTML output — this is what caught and verified the fix for Defect 1.
  - Responsive breakpoint behavior (mobile 3-column grids, desktop 1×9 rows, horizontally-scrollable stat rail, bottom navigation) was verified by reading the actual Chakra `templateColumns`/`display` breakpoint props in source (three independent passes cross-checked these against UX.md's literal wording), not by rendering the app in a real browser at each of the five required viewport widths and visually inspecting the result. This is a genuine gap: **visual/computed-layout confirmation across narrow-mobile/common-mobile/tablet/desktop/wide-desktop viewports was not performed and is not claimed here.**
  - Pages requiring live TMDB data (`/movie/[id]`, `/tv/show/[id]`, season/episode pages, `/search`, Home's discovery shelves) could not be rendered end-to-end with real content in this sandbox, since `TMDB_API_KEY` is a placeholder and outbound calls to `api.themoviedb.org` would fail authentication. Their content hierarchy and normalizer/fallback logic were verified by direct source review and by the existing test suite's TMDB-response-fixture-driven assertions, not by loading a real TMDB-backed page in a browser.

None of the above blockers affect the four defects fixed in this pass — those were each verified either by direct, deterministic code/test evidence (Defects 2–4) or by a live server response diff (Defect 1). They are listed here so remaining risk is not misrepresented as fully closed.

## Status definitions

| Status | Meaning |
| --- | --- |
| **Complete** | Verified against the exact wording of `UX.md` in this pass via source review and/or automated test/live-server evidence; implementation matches. |
| **Fixed this pass** | A real discrepancy was found and corrected during this pass; verified complete afterward per the evidence cited for that defect. |
| **Accepted as necessary / Known accepted deviation** | A minimal, documented deviation required to make an explicitly-specified requirement actually work, or an existing route/behavior judged in-scope but not a UX.md-defined feature. |
