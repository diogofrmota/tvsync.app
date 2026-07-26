# BEHAVIOR.md

The observable behavior contract for every route in `src/app`, derived from the
code as of `pre-refactor-baseline` (commit `babdcf4`). This is what the
refactor must preserve. Where the code disagrees with `AGENTS.md`, the
disagreement is called out explicitly rather than silently resolved.

Legend for **Access**: `public` = renders the same for anyone, no session read;
`public+session` = renders for anyone but reads the session for a redirect or a
small conditional; `auth-required` = redirects to `/login` when signed out;
`admin` = gated by the separate `/admin` credential cookie, not user auth.

---

## Global shell

| File | Behavior |
| --- | --- |
| `src/app/layout.tsx` | Root layout. Reads the session (for the Chakra/session `Provider`) and `isAnalyticsAllowed()` on every request. Renders the Umami script tag only when analytics is allowed *and* both `NEXT_PUBLIC_UMAMI_WEBSITE_ID`/`NEXT_PUBLIC_UMAMI_SRC` are set — otherwise the tag is omitted entirely, not just disabled. |
| `src/app/error.tsx` | Client component. Generic error boundary with "Try again" / "Go home". |
| `src/app/not-found.tsx` | Renders `lib/pages/404`. |
| `src/app/loading.tsx` | Renders `lib/pages/home`'s `HomeLoading` — used as the route-level Suspense fallback for `/`. |

---

## Home

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/` | public+session | Redirects authenticated users to `/movies`. For anonymous visitors: `loadHomeCuratedRails()` (admin-curated lists from Neon) + `loadHomeDiscoverySections()` (TMDB trending/discover, one page per rail) in parallel. | `Home` component. | None. | `force-dynamic` — every anonymous view is a fresh function invocation, **but** the underlying TMDB and curated-list reads are wrapped in `unstable_cache`/Next `fetch` revalidate (see Caching Layers below), so the invocation is cheap, not free. |

**Key finding:** `/` performs no session-dependent branching for anonymous
visitors and no per-user data read for them — the rendered output is byte-for-
byte identical for every anonymous visitor at a given moment. This matches
what you described: the rails are the same for all users. It is a strong
candidate for ISR (e.g. `export const revalidate = <n>`) instead of
`force-dynamic`, which would remove the per-view function invocation
entirely for anonymous traffic — see the note in "Refactor-relevant findings"
below.

---

## Explore / search

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/explore` | **auth-required** | No query: none besides the redirect check. With a query: `loadSearchLibraryState()` (the signed-in user's library, to badge results) + TMDB search. | No query → `ExploreDiscover`. With query → `SearchResultsPage`. | None on this route. | `force-dynamic`. |

**Correction vs. the pre-refactor checklist:** `/explore` is **not** a public
discovery page today — `ExplorePage` redirects to `/login` immediately when
`session?.user` is falsy, for both the bare page and the search-query case.
Any earlier assumption that "/explore" is part of an anonymous browsing
journey is wrong; it is a signed-in-only page. The public, TMDB-only discovery
surfaces are `/`, `/movies/[section]`, `/movies/genre/[genre]`, and
`/tv/[listType]` (see below) — those are the ones that are actually uniform
across anonymous and signed-in users.

---

## Movies

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/movies` | **auth-required** | `loadOwnMovieLibraryItems()` — the signed-in user's personal movie library from Neon. | `MoviesPage` (personal library, not a discovery page). | Watch-status/favorite mutations flow through `lib/features/library` and `lib/features/tracking` server actions from this page. | Not `force-dynamic` (no explicit `dynamic` export) — Next defaults to dynamic anyway because it reads the session per-request, but it is not pinned. |
| `/movies/[section]` (`now_playing`, `popular`, `top_rated`, `upcoming`) | **public** — no session read at all | `section === 'popular'` with no query params renders `MovieOverview` (curated home-style rails for movies); every other section/query combination renders `MovieListPage`, fed by TMDB list endpoints. | `MovieOverview` or `MovieListPage`. | None. | No `dynamic` export; TMDB reads go through `unstable_cache`/fetch-revalidate (`TMDB_REVALIDATE_SECONDS.list` = 24h, `topRated` = 7d). |
| `/movies/genre/[genre]` | **public** — no session read | TMDB discover-by-genre, always `section: 'popular'`. | `MovieListPage`. | None. | Same as above. |

**Key finding:** `/movies/[section]` and `/movies/genre/[genre]` never read
the session and never fetch per-user data — they are uniform, cacheable
public pages today, and they are **not** `force-dynamic`, unlike almost
everything else in the app. They are the closest thing in the current
codebase to "already doing it right" for the free-tier cost target.

---

## TV shows

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/tv-shows` | **auth-required** | `loadOwnTvLibraryItems()` — personal TV library. | `TvShowsPage`. | Same library/tracking actions as `/movies`. | Not `force-dynamic`, dynamic by session read. |
| `/tv/[listType]` | **public** — no session read | `listType === 'popular'` with no query renders `TVOverview`; otherwise `TVShowListPage` from TMDB. | `TVOverview` or `TVShowListPage`. | None. | No `dynamic` export; same TMDB cache windows as movies. |

---

## Movie detail, reviews, images

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/movie/[id]` | public+session | `getMovieDetailServer` (required — a failure 404s the page); credits, videos, reviews (each individually `.catch()`-degraded to empty, never fails the page); `getImdbRatingServer`; `isMovieDetailViewerAuthenticated()` for a small auth-gated affordance (e.g. showing library actions vs. a login prompt). | `MovieDetailPage`. | Favorite/rating/watch-status mutations available if authenticated, via `lib/features/library`. | `force-dynamic`. TMDB reads individually cached 24h (detail/credits/videos), reviews 12h. |
| `/movie/[id]/reviews` | public | `getMovieDetailServer` (title only) + reviews (degrades to empty). | `MediaReviewsPage`. | None. | `force-dynamic`. |
| `/movie/[id]/images` | public | `MovieImagesPage` (loads its own TMDB images data internally). | `MovieImagesPage`. | None. | `force-dynamic`; excluded from indexing (`robots: noindex,nofollow`). |

## TV show detail, season, episode, reviews

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/tv/show/[id]` | public+session | `getTvShowDetail` (required); credits/videos/external-ids/reviews each `.catch()`-degraded; `isTvShowDetailViewerAuthenticated()`. | `TvShowDetailPage`. | Favorite/rating/watch-status via `lib/features/library`, gated on auth. | `force-dynamic`. |
| `/tv/show/[id]/reviews` | public | Show name + reviews (degraded). | `MediaReviewsPage`. | None. | `force-dynamic`. |
| `/tv/show/[id]/season/[seasonNumber]` | public+session | TMDB season detail (required) + show detail (`.catch(() => null)`, degrades show name only) + `getSeasonProgressState()` — **this always runs**, authenticated or not, and derives from `session.user.id` internally (returns an empty/default state for anonymous viewers rather than gating the whole page). | `TVSeasonDetailPage`. | Whole-season / per-episode watched toggles, gated on auth at the action layer. | `force-dynamic`. |
| `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]` | public+session | Episode detail + show detail + current season (required); adjacent seasons fetched conditionally and `.catch(() => null)`-degraded; `getEpisodeProgressState()` + `getTvProgressSummary()` — same "always runs, empty for anonymous" pattern as season progress. | `TVEpisodeDetailPage`. | Mark watched/unwatched, gated on auth at the action layer. | `force-dynamic`; excluded from indexing. |

**Note:** unlike the discovery pages, detail/season/episode pages are
genuinely per-viewer once signed in (progress/favorite/rating state is read
per request), so they are not simple ISR candidates as-is — Phase 4.1's
proposal to split the public TMDB shell from a client-fetched personal overlay
applies most directly here.

---

## Curated lists

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/lists/[id]` | public | `findPublicCuratedList(id)` — only `active`/published admin-curated lists resolve; anything else 404s (an unpublished draft is indistinguishable from a nonexistent id). | `CuratedListPage`. | None. | `force-dynamic` despite the underlying curated-list read itself being `unstable_cache`'d for 300s (`CURATED_LISTS_REVALIDATE_SECONDS`). Another public+uniform page pinned dynamic for no data-dependent reason. |

---

## Auth pages

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/login` | public+session | Redirects signed-in users to the (sanitized) callback URL. | `LoginAuthPage`. | Credentials/Google sign-in via NextAuth. | No `dynamic` export. |
| `/register` | public+session | Same redirect pattern. | `RegisterAuthPage`. | Registration server action. | No `dynamic` export. |
| `/forgot-password` | public+session | Redirects signed-in users to `/profile`. | `ForgotPasswordAuthPage`. | Sends reset email. | No `dynamic` export. |
| `/reset-password` | public | Validates the reset token server-side (`isPasswordResetTokenValid`) before render, so an invalid/expired token is caught immediately rather than only on submit. | `ResetPasswordAuthPage`. | Sets new password. | No `dynamic` export. |
| `/verify-email` | public | Consumes the verification token on load — **visiting the link changes state**, this is not idempotent GET-as-read. | `VerifyEmailAuthPage`. | None additional. | No `dynamic` export. |
| `/verify-email-change` | public | Same token-consuming-on-GET pattern for email-change confirmation; sends a "your email changed" notice to the *old* address on success (best-effort — failure to send doesn't roll back the change). | `EmailChangeVerificationPage`. | None additional. | No `dynamic` export. |

**Note on GET-consumes-token routes:** `/verify-email`,
`/verify-email-change`, and effectively `/reset-password`'s token check are
side-effecting on GET. This is a real property to preserve carefully during
any refactor of routing/caching — anything that makes Next.js prefetch these
links (e.g. `<Link>` prefetch, a crawler, browser link-scanning) would
consume the token before the user acts. Confirm current behavior already
guards against this (worth a dedicated check) rather than assuming it's safe
just because it predates the refactor.

---

## Profile

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/profile` | auth-required | Own profile (required — missing record shows a dedicated issue panel, not a crash); statistics/favourites/follow-counts/library-preview each independently `withFallback`-degraded to an empty default on failure, so one bad query never blanks the whole page. | `ProfilePage` or `ProfileAccessIssue`. | None directly; links out to edit/library pages. | `force-dynamic`. |
| `/profile/edit` | auth-required | Own profile + own auth methods. | `EditProfilePage` or `ProfileAccessIssue`. | Profile edit, password change, email change, Download-My-Data export, Delete-Account, analytics opt-out — all under "Privacy Choices" per `AGENTS.md`. | `force-dynamic`. |
| `/profile/statistics` | auth-required (via `requireOwnProfile`) | Own statistics, degraded to zeroes on failure. | `ProfileStatisticsPage`. | None. | `force-dynamic`. |
| `/profile/favorites/[mediaType]` | auth-required (via `requireOwnProfile`) | Own favourites, degraded to `[]` on failure. | `ProfileFavoritesPage`. | None. | `force-dynamic`. |
| `/profile/[username]` | public | `getPublicProfileData(username)` — 404s if the user doesn't exist *or* the profile isn't public (indistinguishable from the outside, which is the intended privacy behavior per `AGENTS.md`: "Public profile reads must honor `privacy_setting = 'public'`"). | `PublicProfilePage`. | None. | `force-dynamic`. |
| `/profile/[username]/favorites/[mediaType]` | public | Same `getPublicProfileData` gate. | `ProfileFavoritesPage`. | None. | `force-dynamic`. |
| `/profile/[username]/followers` | public | `loadProfileConnectionsPage({ kind: 'followers' })`. | Delegated page component. | None. | `force-dynamic`. |
| `/profile/[username]/following` | public | `loadProfileConnectionsPage({ kind: 'following' })`, optional `?compare=statistics`. | Delegated page component. | None. | `force-dynamic`. |

---

## Watchlist

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/watchlist` | auth-required | `loadOwnWatchlistPageItems()`. | `WatchlistPage`. | Add/remove watchlist entries via `lib/features/watchlist`. | No `dynamic` export (implicitly dynamic via session read). |

---

## Static/legal

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/privacy` | public | None. | Static legal copy (`LegalPage`). | None. | No `dynamic` export — genuinely static, no reason it couldn't be prerendered. |
| `/terms` | public | None. | Static legal copy. Explicitly notes it has **not** been reviewed for a named legal entity/jurisdiction. | None. | Static. |
| `/contact` | public | None to render; submission goes through a server action. | `ContactForm`. | Contact submission, throttled via the shared `auth_rate_limits` table (`consumeAuthRateLimit`) per `AGENTS.md`. | No `dynamic` export. |

---

## Admin

| Route | Access | Data | Render | Mutations | Caching |
| --- | --- | --- | --- | --- | --- |
| `/admin` | **admin** (separate signed-cookie session, not user auth; see `AGENTS.md` "Admin Dashboard Notes") | Live counters, moderation queues, discovery-list settings, curated lists — all requiring a re-verified `requireAdminSession()` per `AGENTS.md`. | `AdminPage`. | Ban/unban, discovery-list edits, curated-list CRUD — all re-authorize server-side per mutation, never trust the rendered page as authorization. | `force-dynamic`; excluded from sitemap/robots and not linked from any nav, per `AGENTS.md`. |

---

## API route handlers

| Route | Access | Behavior |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | public | Standard NextAuth handler (credentials + Google). |
| `/api/cron/cleanup` | Vercel Cron only | Requires `Authorization: Bearer $CRON_SECRET`; refuses to run without a configured secret rather than exposing an open trigger. Purges expired auth records and admin-audit entries older than 90 days. Scheduled nightly (`vercel.json`, `0 3 * * *`). |
| `/api/tmdb/[[...path]]` | public, rate-limited | The only TMDB proxy surface client code is allowed to call (per `AGENTS.md`, `TMDB_API_KEY` must never reach the client). Validates path shape against an explicit allowlist per resource (`discover`, `genre`, `movie`, `person`, `search`, `trending`, `tv`), strips any query param not in an explicit allowlist, and blocks a few TMDB session/auth param names outright. Per-resource revalidate windows (`search` shortest, `trending` medium, everything else `list`). Rate-limited by client IP (`checkTmdbProxyRateLimit`). Response carries both a browser `Cache-Control` and a `Vercel-CDN-Cache-Control` header for edge caching. |

---

## Caching layers already in place (important context for Phase 4.1)

Two caching layers already exist and are easy to conflate:

1. **Route-level rendering mode** (`export const dynamic`) — this is what
   determines whether Vercel runs a function per request at all. 20 routes
   pin `force-dynamic`; the rest have no explicit `dynamic` export (which
   still ends up dynamic in practice wherever a route reads the session or an
   uncached DB call, but isn't pinned against ever being static).
2. **Data Cache within a dynamic render** (`unstable_cache`, `next: {
   revalidate }` on `fetch`) — this is what makes a `force-dynamic` route
   still cheap: the *function invocation* happens every request, but the
   *TMDB/DB read inside it* is frequently served from Next's Data Cache
   instead of hitting TMDB or Neon again. Confirmed cache windows: TMDB detail/
   credits/videos/recommendations 24h, providers 12h, reviews 12h, list 24h,
   top-rated 7d; curated lists 300s; discovery-list settings 300s; admin
   overview stats 60s; session-version check 30s.

The refactor-relevant implication: moving a route off `force-dynamic` doesn't
just add a cache layer that doesn't exist yet — it removes the per-request
**function invocation**, which is the unit Vercel's free-tier invocation limit
and GB-hours are billed on. The Data Cache layer already softens the
*downstream* TMDB/Neon load; it does nothing for the invocation count itself.

---

## Refactor-relevant findings (public + uniform vs. genuinely dynamic)

Routes that read no session and no per-user data — genuinely identical output
for every visitor, and the strongest static/ISR candidates:

- `/` (for anonymous visitors specifically — it redirects authenticated users away)
- `/movies/[section]` (all four sections)
- `/movies/genre/[genre]`
- `/tv/[listType]` (all list types)
- `/lists/[id]`
- `/privacy`, `/terms`

Routes that are public-readable but embed a small amount of session-derived
branching (an auth affordance, not personal data) — good candidates for
splitting the shell from a client-fetched overlay per Phase 4.1:

- `/movie/[id]`, `/tv/show/[id]` (the `isXDetailViewerAuthenticated()` check)
- `/tv/show/[id]/season/[seasonNumber]` and the episode route (progress state
  always runs and degrades to empty for anonymous viewers — meaning the
  *query* already runs unconditionally even though the *value* is often
  discarded for anonymous visitors)

Routes that are genuinely per-user and must stay dynamic:

- `/profile`, `/profile/edit`, `/profile/statistics`,
  `/profile/favorites/[mediaType]`, `/movies` (bare), `/tv-shows` (bare),
  `/watchlist`, `/explore`, `/admin`

Public profile routes (`/profile/[username]` and its subroutes) are
per-*profile*, not per-*viewer* — they could in principle be ISR'd per
username with a moderate revalidate window, unlike the viewer's own profile
pages.

---

## Discrepancies found against `AGENTS.md`

- `AGENTS.md` doesn't mention that `/explore` requires authentication. Anyone
  reading `AGENTS.md` alone would reasonably assume `/explore` is a public
  discovery surface like `/movies/[section]`; it isn't in the current code.
- `AGENTS.md`'s "Database Notes" section doesn't mention that the *route*
  layer for `/lists/[id]` is pinned `force-dynamic` despite the curated-list
  data underneath already being `unstable_cache`'d for 5 minutes — worth
  reconciling once Phase 4.1's rendering-strategy decision is made, since
  right now the route-level setting throws away the caching the data layer
  already pays for.
- Everything else checked (folder boundaries, database notes, admin notes,
  privacy notes) matched the code as read.
