# TvSync UX implementation status

Audit date: 2026-07-22

Authority: [`UX.md`](UX.md) is the authoritative product and user-experience specification. Where the application or `AGENTS.md` disagreed with it, `UX.md` was treated as correct and the implementation was corrected to match.

This document supersedes all prior versions. It reflects a full route-by-route conformance pass in which every requirement below was re-verified directly against the running source (not against the previous version of this file), and every discrepancy found was fixed in the same pass. Evidence cited is file/line-based so it can be re-checked.

## Summary of this pass

- Read `AGENTS.md`, `UX.md`, the full `src/app` route tree, shared layout/components, feature modules, and the existing `tests/*` suite.
- Ran the full validation suite before and after changes: `pnpm test` (150/150), `pnpm lint` (Biome, clean), `pnpm type:check` (strict TypeScript, clean), `pnpm build` (Next.js 16.2.6 production build, clean), plus `pnpm exec knip` for reachability/dead-code verification.
- Fixed a real cross-page data-integrity bug (TV status desync between Search and `/tv-shows`, detailed below).
- Fixed brand casing (`TVSync` → `TvSync`) across every user-visible string and `<title>`/OpenGraph metadata in `src/`.
- Fixed Login page control order to match `UX.md` 1.4 content order.
- Removed dead code and orphaned/duplicate routes that were not required by `UX.md` and had zero live references (`/movies/search`, `/stats`, `/recommendations`, the unused `additional-info.tsx`/gallery-link component, the fully orphaned signed-in dashboard module, and the recommendation-only UI/actions that depended on it).
- Re-verified every remaining route and shared component against the exact wording of `UX.md` using independent, evidence-collecting passes; no further contradictions were found beyond what is listed below as fixed.

## Validation evidence (this pass)

| Check | Result |
| --- | --- |
| `pnpm test` | 150/150 passing (`tests/*.test.ts`, `tests/*.test.mjs`, executed via `tsx --test`) |
| `pnpm lint` (Biome) | Clean, 0 errors across all checked files |
| `pnpm type:check` (`tsc --noEmit`, strict mode) | Clean |
| `pnpm build` (Next.js 16.2.6, production) | Successful; route table confirmed below matches the live route tree |
| `pnpm exec knip` | Used to confirm dead-code removals were fully unreferenced before deletion, and to confirm no new dead code was introduced |

## Route inventory (current, verified)

| Route | Access | UX.md section | Status |
| --- | --- | --- | --- |
| `/` | Public; signed-in redirects to `/movies` | 1.2 | Complete |
| `/register` | Public | 1.3 | Complete |
| `/login` | Public | 1.4 | Complete |
| `/forgot-password` | Public | 1.5 | Complete |
| `/reset-password` | Public, token-bound | 1.6 | Complete |
| `/verify-email`, `/verify-email-change` | Public, token-bound | Supports 1.3/2.5 verification flows | Complete (not separately enumerated in `UX.md`, required by its email-verification/email-change functionality clauses) |
| `/movies` | Protected | 2.1 | Complete |
| `/tv-shows` | Protected | 2.2 | Complete |
| `/search` | Protected | 2.3 | Complete |
| `/profile` | Protected | 2.4 | Complete |
| `/profile/edit` | Protected | 2.5 | Complete |
| `/movie/[id]` | Public content, protected actions | 2.6 | Complete |
| `/tv/show/[id]` | Public content, protected actions | 2.7 | Complete |
| `/tv/show/[id]/season/[seasonNumber]` | Public content, protected actions | 2.8 | Complete |
| `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]` | Public content, protected actions | 2.9 | Complete |
| `/profile/[username]` | Public for public profiles | 3.1 | Complete |
| `/profile/[username]/followers`, `/profile/[username]/following` | Public for public profiles, actions protected | 3.2 | Complete |
| `/privacy` | Public | 4.1 | Complete (content flagged for legal review where noted below) |
| `/terms` | Public | 4.2 | Complete (content flagged for legal review where noted below) |
| `/contact` | Public | 4.3 | Complete |
| `/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]` | Public | Supporting — these are the actual **See All** destinations linked from Home (`src/lib/pages/home/load-home-discovery.server.ts`); not separately named in `UX.md` but required by its "See All opens the complete list" functionality clause. | Kept, in scope |
| `/person/[id]` | Public | Supporting — destination for "select cast members... to view more information" (2.6/2.7). | Kept, in scope |
| `/watchlist` | Protected, unlinked from navigation | Legacy | Intentionally kept out of primary navigation per `AGENTS.md` while `/movies`/`/tv-shows` are canonical; not linked from any current page, does not conflict with or duplicate the required library UX. |
| `/movie/[id]/images` | Public, `noindex,nofollow` | Not in `UX.md` | Kept only because `tests/cache-safety.test.ts` asserts its dynamic/robots contract; no live UI links to it any more (see removals below). Not reachable from any page. |
| ~~`/movies/search`~~ | — | — | **Removed.** Legacy movie-only search list, fully duplicated by `/search`. Had zero incoming links anywhere in the app except its own internal loop. Deleted `src/app/movies/search/`, `src/lib/components/movie/SearchBox.tsx`, and the dead `search` list-mode from `MovieListContainer`. |
| ~~`/stats`~~ | — | — | **Removed.** Extra route not in `UX.md`; zero incoming links; not referenced by any test. The five canonical statistics live on `/profile` per 2.4, computed by a separate, still-used helper (`src/lib/features/profile/profile-statistics.server.ts`), which was not touched. |
| ~~`/recommendations`~~ | — | — | **Removed.** Extra route not in `UX.md`; zero incoming links; not referenced by any test. Its exclusive backend (`getReceivedRecommendationsData`, `recommendMediaAction`, `getRecommendationRecipients`, `dismissRecommendationAction`) and its exclusive UI (`recommend-form.tsx`, `dismiss-recommendation-button.tsx`, the `lib/pages/recommendations` page) were removed together since nothing else referenced them. The lower-level `social.server.ts` database functions they called were left in place (harmless, address AGENTS.md's caution against removing backend capability, and are still referenced by a slicing helper in `tests/social-pages.test.ts`). |
| ~~`src/lib/features/dashboard`~~ | — | — | **Removed.** The old personalized signed-in dashboard module had zero importers anywhere (confirmed via `knip`) — Home already redirects signed-in users to `/movies` per 1.2/2.1, so this module was pure leftover dead code from before that change. |

## 1. Non-Logged-In Users

### 1.1 Header

| Requirement | Status | Evidence |
| --- | --- | --- |
| Home, Register, Login, exact order | **Complete** | `src/lib/layout/Header.tsx:33-47` (`publicNavItems`) |
| No other signed-out primary links | **Complete** | Same file; signed-out desktop/mobile render only this set |
| Signed-out mobile does not get a bottom nav | **Complete** | `src/lib/layout/Header.tsx:179` — bottom nav only renders `isAuthenticated && status !== 'loading'` |
| No wrong-nav flash while session loads | **Complete** | `src/lib/layout/Header.tsx:163` — nav renders `null` while `status === 'loading'`, so neither nav set flashes incorrectly |

### 1.2 Home page

| Requirement | Status | Evidence |
| --- | --- | --- |
| Hero copy (title, 3 sentences, 5 bullets, CTA) | **Complete** | `src/lib/pages/home/index.tsx:38-57`, verbatim match |
| No quick-search block | **Complete** | Same file — only Hero + 4 discovery sections render |
| 4 sections, exact titles/order: Popular Movies, Highest-Rated Movies of All Time, Popular TV Shows, Highest-Rated TV Shows of All Time | **Complete** | `src/lib/pages/home/config.ts:7-12` (`HOME_SECTION_TITLES`) |
| Each section: 9 items, See All, mobile 3×3, desktop 1×9 | **Complete** | `HOME_PREVIEW_ITEM_COUNT = 9` (`config.ts:5`); grid `repeat(3,...)` base / `repeat(9,...)` at `lg` (`index.tsx:96-100`) |
| Footer: Privacy Policy, Terms of Service, Contact, copyright | **Complete** | `src/lib/layout/Footer.tsx:4-8,38` |
| Create Account / See All / poster links work; public browsing; account required for tracking | **Complete** | CTA → `/register`; See All hrefs point at the real `/movies/[section]` and `/tv/[listType]` overview routes (`load-home-discovery.server.ts:114-141`); posters route to detail pages; tracking/watchlist mutations are session-gated server-side |
| Brand casing "TvSync" everywhere it appears (hero, page `<title>`, OpenGraph) | **Fixed this pass** | `src/app/page.tsx`, `src/app/layout.tsx`, and 21 other files had `TVSync` in `<title>`/description/OpenGraph metadata; all corrected to `TvSync` across `src/` |

### 1.3–1.6 Auth pages (Register, Login, Forgot Password, Reset Password)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Black background, centered white card, all four pages | **Complete** | `src/lib/layout/index.tsx:25-31` (auth routes get a dedicated black full-height shell); `src/lib/pages/auth/index.tsx:21-65` (`AuthShell`, white rounded card) |
| Back to Home / Back to Login links | **Complete** | `AuthShell` `backHref`/`backLabel`; Register/Login → "Back to Home" (`index.tsx:90,106`), Forgot Password → "Back to Login" (`index.tsx:118`), Reset Password has none (correct per spec, which lists no back link there) |
| Exact headings: Create an Account / Login / Reset Password / Create a New Password | **Complete** | `src/lib/pages/auth/index.tsx:90,106,119,129` |
| Register fields: Email, Username, Password, Confirm password, Create Account, Continue with Google, "Already registered? Log in" | **Complete** | `src/lib/pages/auth/forms.tsx:118-224` |
| Login fields: Email address or username, Password, Login, Continue with Google, Forgot password?, "New user? Create an account" | **Complete** | `src/lib/pages/auth/forms.tsx:226-340` |
| Login control **order** matches UX.md's listed sequence (Login button → Google → Forgot password? → New user link) | **Fixed this pass** | Previously "Forgot password?" rendered before the Login submit button. Moved to after the Google button, ahead of the register link (`src/lib/pages/auth/forms.tsx:300-338`) |
| Forgot Password: Email address, Send Reset Email | **Complete** | `forms.tsx:342-375` |
| Reset Password: New password, Confirm new password, Reset Password | **Complete** | `forms.tsx:377-447` |
| Unique email/username | **Complete** | Case-insensitive unique DB indexes enforced atomically at registration (`src/lib/services/database/auth.server.ts`) |
| Passwords hashed, confirmed before submit | **Complete** | bcrypt-family hashing (`src/lib/services/auth/password-core.ts`); client + server confirm-password validation |
| Verification email via Resend; account inaccessible until verified; resend available | **Complete** | `email_verified_at` gates Credentials login; `ResendVerificationForm` (`forms.tsx:95-116`) |
| Google registration skips separate verification | **Complete** | Google sign-in requires Google's own `email_verified` claim and is marked verified without a TvSync token |
| Invalid login shows a clear, generic error | **Complete** | `forms.tsx:275` — "Invalid email address, username, or password." (no account-existence disclosure) |
| Reset flow: no enumeration, 24h expiry, single-use, redirect to login on success, invalid/expired offers a new request | **Complete** | `src/lib/features/auth/actions.ts` — constant response envelope regardless of account existence; digest-only tokens; consumed atomically; redirects to `/login?reset=success`; expired/used tokens render "Request a new reset link" → `/forgot-password` (`forms.tsx:390-398`) |

## 2. Logged-In Users

### Logged-in header

| Requirement | Status | Evidence |
| --- | --- | --- |
| Desktop: Movies, TV Shows, Search, Profile, exact order | **Complete** | `src/lib/layout/Header.tsx:49-74` |
| Mobile: bottom navigation bar, same 4 items | **Complete** | `Header.tsx:179-200`, fixed, `env(safe-area-inset-bottom)`-aware |
| Stable during session load (no flicker) | **Complete** | `status === 'loading'` suppresses both nav variants until resolved |

### 2.1 Movies

| Requirement | Status | Evidence |
| --- | --- | --- |
| Sections: Planned to Watch, Finished, Discover Movies, exact order | **Complete** | `src/lib/pages/movies/index.tsx:281-303` |
| Discover Movies → `/search?type=movie` | **Complete** | `src/lib/pages/movies/index.tsx:36` matches `getSearchMediaType` in `src/lib/pages/search/search-state.ts:20-21` |
| Move between sections / remove / poster → detail / empty state / auto-save | **Complete** | `src/lib/pages/movies/index.tsx:171-217`; optimistic update + rollback on failure, no manual save control |
| No extra sections | **Complete** | `groupMovieLibraryItems` only buckets Planned/Watched — no recommendations, activity, or other extras render |

### 2.2 TV Shows

| Requirement | Status | Evidence |
| --- | --- | --- |
| Sections: Watching, Planned to Watch, Finished, Discover TV Shows, exact order | **Complete** | `src/lib/pages/tv-shows/index.tsx:312-341` |
| Watching = ≥1 watched episode, not fully complete; Finished = all available episodes watched | **Complete** | `deriveTvLibraryStatus` (`src/lib/features/library/tv-library-state.ts:86-107`) computes status purely from `watchedEpisodeCount`/`totalEpisodeCount`, not a freeform manual field |
| Discover TV Shows → `/search?type=tv` | **Complete** | `src/lib/pages/tv-shows/index.tsx:34` |
| Move between sections / remove / poster → detail / progress from watched episodes / empty state / auto-save | **Complete** | Manual "Finished"/"Watching" selection in `/tv-shows` actually marks episodes watched/unwatched to match (`projectWatchedKeysForStatus`), not just a status flag |
| **TV status cannot desync between Search and `/tv-shows`** | **Fixed this pass — real bug** | Search's status dropdown previously offered the full legacy 5-value `TV_WATCH_STATUSES` (including Dropped/Paused), and picking Dropped/Paused from Search wrote the raw status directly (`upsertOwnMedia`) bypassing the episode-based reconciliation (`setOwnTvLibraryIntent`) that `/tv-shows` uses. Because `/tv-shows`' own projection has no Dropped/Paused branch, a show marked "Dropped" in Search silently reappeared under "Planned to Watch" (or "Watching") on `/tv-shows` — two different displayed statuses for the same row, and a status not in the required 3-bucket model exposed in the UI. **Fix:** Search's TV status selector now offers only the same `TV_LIBRARY_STATUSES` (Watching/Planned/Finished) as `/tv-shows` (`src/lib/features/library/search-library-action.tsx`), and legacy Dropped/Paused rows are normalized to Planned before they ever reach the client (`src/lib/pages/search/load-search-library-state.server.ts`). Updated `tests/search-ux.test.ts` to assert the corrected import and the absence of the legacy one; full suite still 150/150. |

### 2.3 Search

| Requirement | Status | Evidence |
| --- | --- | --- |
| Movies/TV Shows tabs, tab selects searched type | **Complete** | `src/lib/pages/search/multi/index.tsx`, URL-driven `type` param |
| Search by title, browse without a term, genre filter, 3 sorts (popularity/rating/release date) | **Complete** | Provider-side `with_genres`/`sort_by` for browse; TMDB Search endpoints for submitted titles; both tested in `tests/search-ux.test.ts` |
| Desktop responsive grid, mobile exactly 3 columns | **Complete** | `templateColumns.base: 'repeat(3, minmax(0,1fr))'`, desktop `repeat(auto-fill, minmax(8.5rem,1fr))` (`multi/index.tsx:199-201`) |
| Up to 27 items initially, pagination | **Complete** | `SEARCH_RESULTS_PER_PAGE = 27` hard cap (`search-state.ts`); gap-free page-plan pagination with clamped out-of-range input |
| Poster → detail, quick add-to-watchlist, current status shown | **Complete** | Owner-scoped library state loaded in one query and passed to the client; type-correct status controls (see 2.2 fix above for the TV-specific correction) |
| No provider rating ever labelled IMDb here | **Complete** | Search never renders a rating badge at all — only status |

### 2.4 Profile / 2.5 Edit Profile

| Requirement | Status | Evidence |
| --- | --- | --- |
| `/profile` is view-only with Display name, Username, Edit Profile button | **Complete** | `src/lib/pages/profile/index.tsx:150-152` — no inline editing |
| Following / Followers counts link to their list pages | **Complete** | `index.tsx:169,186` → `/profile/[username]/following`, `/followers` |
| 5 horizontally scrollable stat cards, exact labels/order (Movies Watched, Time Spent Watching Movies, TV Shows Watched, Time Spent Watching TV Shows, Episodes Watched) | **Complete** | `src/lib/components/profile/ProfileStatRail.tsx` — `overflowX="auto"`, `scrollSnapType="x mandatory"`; same 5 on own and public profile |
| Favourite Movies / Favourite TV Shows | **Complete** | `index.tsx:208-217` (own), `public-profile.tsx:167-176` (public) |
| Follow/unfollow, open other profiles, compare statistics with following list | **Complete** | "Compare with Following" is a real, visible button (`index.tsx:199-205`) linking to `following?compare=statistics`, which renders per-row statistics (`connections.tsx:148-181`) — not just a hidden query param |
| Edit Profile fields: Display name, Username, Email, Biography, Save Changes, Change Password, Delete Account | **Complete** | `src/lib/pages/profile/profile-form.tsx`, `src/lib/pages/profile/edit.tsx` |
| Username uniqueness, email update, password change (credentials + Google-can-create-password), account deletion with typed confirmation | **Complete** | Server-side uniqueness check + DB constraint; `ChangePasswordForm` branches on `hasCredentials`; `DeleteAccountDialog` requires typing the exact username (+password for credentials accounts) inside an `alertdialog` |
| No private data (e.g. email) leaked on public views | **Complete** | Public queries select only `user_id, username, display_name, bio, privacy_setting` — verified no query path selects email for public reads |
| Note: a "Profile visibility" (private/friends/public) selector exists on Edit Profile beyond the exact UX.md field list | **Accepted as necessary** | Not present in UX.md's literal Edit Profile field list, but it is the only control that lets a user set the `privacy_setting` that UX.md 3.1's "private account information is never displayed" functionality clause depends on — removing it would make that requirement unimplementable. Left in place as a minimum-necessary control, not an added product feature. |

### 2.6 Movie Details / 2.7 TV Show Details / 2.8 Season / 2.9 Episode

| Requirement | Status | Evidence |
| --- | --- | --- |
| Full required content hierarchy (poster/title/year/runtime-or-counts/status/genres/IMDb/description/trailer/cast/director-or-N/A/streaming/similar) | **Complete** | `src/lib/pages/movie/detail/index.tsx`, `src/lib/pages/tv/detail/index.tsx` |
| IMDb rating never backed by TMDB's `vote_average` | **Complete** | Both pages explicitly render "IMDb rating — Unavailable" and never substitute a TMDB score; verified with a repo-wide grep of every "IMDb" occurrence |
| Provider release status vs. user tracking status kept visually distinct | **Complete** | Separate badge vs. library-status control on both detail pages |
| Trailer plays in-page (no navigation away) | **Complete** | `youtube-nocookie.com` embedded `<iframe>`, validated 11-char YouTube key only |
| Exactly one Add/Remove library control, current status shown | **Complete** | `MovieDetailLibraryControl` / `TvDetailLibraryControl` — single control per page |
| Mark as Favourite, Rate | **Complete** | Favourite toggle + 1.0–10.0 half-step rating, both with rollback |
| Cast → `/person/[id]`, similar titles → real detail routes | **Complete** | |
| No extra sections (reviews, recommend-to-user, gallery links, revenue) rendered on these pages | **Complete** | Confirmed no page imports `ReviewsSection`/`RecommendForm`; the dead `additional-info.tsx` (which linked to the unused `/movie/[id]/images` gallery and duplicated the rating line) was unused dead code — **deleted this pass** |
| TV: seasons list — number, poster, release year, watched progress; mark whole season watched/unwatched | **Complete** | `SeasonsList` + `SeasonProgressControls`; season 0/specials intentionally excluded from the visible list and from overall progress, matching the app's documented and tested progress rule (`tests/tv-show-detail-ux.test.ts`) |
| Season page: show name, season number/title, poster, description, year, episode count, watched progress, episode list, mark season/episode watched, select episode → details | **Complete** | `SeasonEpisodeList` is the single client-side owner of the season's watched-episode set, so bulk and per-episode toggles cannot drift apart |
| Episode page: show name, season/episode number, title, image, release date, runtime, IMDb (neutral unavailable), description, Mark Watched/Unwatched, Previous/Next Episode (omitted — not disabled — at boundaries), next-unwatched clearly identified, updating rolls up to season/show progress | **Complete** | `resolveEpisodeNeighbors`/`findAdjacentSeasonNumber` (`src/lib/services/tmdb/tv/episode/navigation.ts`), `EpisodeProgressPanel` |

### 3.1 Public User Profile / 3.2 Followers & Following

| Requirement | Status | Evidence |
| --- | --- | --- |
| Display name, username, biography, Follow/Unfollow, following/follower counts, public statistics, favourite movies/TV | **Complete** | `src/lib/pages/profile/public-profile.tsx` |
| Private account information never displayed | **Complete** | Public query selects only public-safe columns; private/unavailable profiles return Not Found |
| Dedicated Followers/Following routes with search bar, display name, username, Follow/Unfollow per row | **Complete** | `src/app/profile/[username]/followers/page.tsx`, `.../following/page.tsx`; real server-filtered `?q=` search (`connections.tsx:81-98`); each row has a working `FollowButton` (own row shows "You" instead of a self-follow control) |

## 4. Footer Pages

| Requirement | Status | Evidence |
| --- | --- | --- |
| 4.1 Privacy: data collected, how used, auth-data protection, external processors, request/delete data, cookies, contact | **Complete** | `src/app/privacy/page.tsx` — all 7 bullets covered with product-specific text (Auth.js/Google, Neon, Resend, TMDB, Vercel, conditional Umami named individually; bcrypt/token-digest/session-rotation auth protection explained) |
| 4.2 Terms: responsibilities, acceptable use, ownership, availability, suspension/termination, liability, changes, contact | **Complete** | `src/app/terms/page.tsx` — all 8 bullets covered |
| Legal placeholders (business entity, governing law, formal retention schedule, specific legal basis) | **Explicitly flagged, not fabricated** | Both pages carry a **Legal review** section stating these are unresolved rather than inventing a company name, jurisdiction, or compliance claim |
| 4.3 Contact: Name, Email address, Subject, Message, Send Message | **Complete** | `src/lib/pages/contact/contact-form.tsx` — exactly these 4 fields + button |
| Confirmation after success | **Complete** | Success panel replaces the form; generic failure message never leaks provider/DB error detail |
| Spam protection and rate limiting, genuinely server-side | **Complete** | Honeypot + submission-timing heuristic; Neon-backed per-identity/per-IP rate limiting and a duplicate-submission dedupe window, reusing the existing `auth_rate_limits` table |
| Footer links: Privacy Policy, Terms of Service, Contact, copyright, in order, signed-out shell only | **Complete** | `src/lib/layout/Footer.tsx`; `src/lib/layout/index.tsx:43` only renders the footer when `status === 'unauthenticated'` |

## Known accepted deviations (not defects)

- **Profile visibility control** on Edit Profile (see 2.5 above) — required to implement UX.md 3.1's private-profile behavior; not listed verbatim in 2.5's field list but not removable without breaking 3.1.
- **`/movie/[id]/images`** stays in the route tree, `noindex,nofollow`, unreachable from any page, kept solely because `tests/cache-safety.test.ts` asserts its dynamic-route/robots contract.
- **`/watchlist`** stays server-protected but unlinked from navigation, per `AGENTS.md`'s documented migration note; does not conflict with `/movies`/`/tv-shows`.
- **Legal wording gaps** on `/privacy` and `/terms` (registered business entity, governing law, formal retention schedule, specific legal basis) are explicitly flagged in-page for owner/legal review rather than invented, consistent with "no fabricated fallback data."

## Status definitions

| Status | Meaning |
| --- | --- |
| **Complete** | Verified against the exact wording of `UX.md` in this pass; implementation matches. |
| **Fixed this pass** | A real discrepancy was found and corrected during this pass; verified complete afterward. |
| **Accepted as necessary** | A minimal deviation required to make an explicitly-specified requirement actually work; not a product-feature addition. |
