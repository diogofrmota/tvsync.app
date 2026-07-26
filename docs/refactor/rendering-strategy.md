# Rendering strategy decision

Per-route target for all 43 routes, using `BEHAVIOR.md`'s access/data
classification and `docs/baseline/cost-model.md`'s finding that Vercel's
invocation cap breaks at just 1% DAU, driven directly by 20 routes
rendering dynamically on every view. This is the single highest-leverage
change available before touching anything else in the refactor.

## The principle this decision rests on

Three Next.js APIs force per-request dynamic execution **regardless of
whether `export const dynamic = 'force-dynamic'` is set** — reading
`cookies()` (which `getAuthSession()` does internally via
`getServerSession`), reading `searchParams`, and reading `headers()`. A
route can have no `dynamic` export at all and still never be static or
ISR-eligible if its render path touches any of these. This matters because
several routes in `BEHAVIOR.md`'s table are recorded as "no `dynamic`
export" — which is true, but isn't the same as "already static." Getting
these routes onto ISR requires removing the dynamic-API read from the
*page's own render path*, not just deleting a pragma.

## Group 1: Move to ISR — no caveats

These read no cookies, no session, no searchParams that affect output.
Straightforward `export const revalidate = <n>` (or route-segment config),
no restructuring needed.

| Route | Target | Revalidate | Why this window |
| --- | --- | --- | --- |
| `/lists/[id]` | ISR | 300s | Matches `CURATED_LISTS_REVALIDATE_SECONDS` — the underlying data already refreshes on this cycle; the route pin was just throwing that away. |
| `/privacy` | Static | — (fully static) | Zero data dependency at all. |
| `/terms` | Static | — (fully static) | Same. |

Removing `force-dynamic` from `/lists/[id]` alone converts every anonymous
view of a published curated list from a function invocation into a CDN-served
response between revalidations — directly the invocation metric
`docs/baseline/cost-model.md` flagged as breaking first.

## Group 2: Move to ISR — needs the redirect check relocated first

**`/`** reads `getAuthSession()` specifically to redirect signed-in users to
`/movies`. That cookie read forces dynamic execution for *every* visitor,
authenticated or not, even though the rendered output for anonymous
visitors is already proven identical (`BEHAVIOR.md`'s key finding). Adding
`revalidate` to the page as-is would not help — the session check still
runs per request before the cache could ever be consulted.

**The fix**: move the authenticated-redirect check into Next.js middleware
(`middleware.ts`, matched to `/`), which runs at the edge *before* the
cached/ISR response is served. Middleware already has access to the
session cookie without needing to execute the page's React tree. Once the
redirect lives in middleware, `/` itself has zero remaining per-request
logic and can be a straightforward ISR page — `revalidate = 300`, matching
the curated-rails cache window, same reasoning as `/lists/[id]`.

This is the single biggest win available: Home is very likely the
highest-traffic anonymous route in the app, and moving it off a per-request
function invocation entirely (middleware is billed differently and far
more cheaply than a full function invocation, and ISR cache hits serve from
Vercel's edge with no function invocation at all) is the one change most
directly answering `docs/baseline/cost-model.md`'s finding.

## Group 3: Needs its own sub-decision — searchParams complicates the easy answer

**`/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]`** are
recorded in `BEHAVIOR.md` as having no `dynamic` export and no session
read — true, but they all read `searchParams` in their page function to
decide between the static-feeling "popular overview" branch and the
query-filtered `MovieListPage`/`TVShowListPage` branch. Reading
`searchParams` at all opts the *whole* route out of static rendering in
today's structure, even for the zero-query case that's otherwise identical
to `/`'s situation.

**Two honest options, not one obvious fix:**

1. **Split the route.** Move the no-query "popular overview" rendering into
   a path that never touches `searchParams` (e.g., handle `popular` with no
   query as its own branch that doesn't destructure `searchParams` at all,
   or split into a separate static segment), leaving the query-filtered
   case as a genuinely dynamic sibling. This gets the common case (someone
   just browsing `/movies/popular`) onto ISR while keeping filtered
   list views dynamic, which they legitimately need to be.
2. **Leave dynamic, rely on the Data Cache.** These routes' underlying TMDB
   reads are already cached 24h (`list`) to 7 days (`topRated`) per
   `BEHAVIOR.md`'s caching-layers section. A function invocation still
   happens per view, but it does no uncached upstream work. This is
   strictly worse than option 1 for the invocation-count metric, but zero
   restructuring risk.

Given `docs/baseline/cost-model.md`'s finding that invocations, not compute
time, are the sharper Vercel constraint, option 1 is worth the
restructuring cost — but it's real restructuring (a route split, not a
one-line pragma), so size it as such rather than lumping it in with
Group 1's zero-caveat wins.

## Group 4: Split the public shell from a client-fetched personal overlay

This is `BEHAVIOR.md`'s own proposal for the detail/season/episode routes,
made concrete:

**`/movie/[id]`, `/tv/show/[id]`** currently call
`isMovieDetailViewerAuthenticated()`/`isTvShowDetailViewerAuthenticated()`
in the page's own render path — a cookie read, forcing dynamic execution —
purely to decide "show the favorite/rating controls" vs. "show a
login/register prompt." **`/tv/show/[id]/season/[seasonNumber]`** and the
episode route go further: `getSeasonProgressState()` /
`getEpisodeProgressState()` / `getTvProgressSummary()` run unconditionally
on every request, deriving `session.user.id` internally and returning an
empty/default result for anonymous viewers — meaning the query already
executes for every anonymous view even though its result is thrown away.

**The fix, same shape for all four routes:**

1. Remove the session/auth read from the page's own render path. The page
   becomes ISR (`revalidate` matching the TMDB detail cache window — 24h)
   and renders the public TMDB content plus a placeholder slot for the
   personal overlay.
2. Add one small client component (e.g. `PersonalOverlay`) that mounts in
   that slot, and on mount, fetches the viewer's favorite/rating/progress
   state through a small dedicated route handler (or the existing
   server actions, called via a client-side `fetch`) — the same pattern
   already used for the SWR-based TMDB proxy calls per `AGENTS.md`'s rule
   that client components fetch through `/api/tmdb` rather than reading
   secrets directly.
3. For anonymous visitors, that client fetch returns instantly (no session
   cookie, no DB query needed at all — this is strictly better than
   today's behavior of running the DB query and discarding the result).
   For signed-in visitors, it's one extra small request after the main
   content has already painted, trading a little bit of perceived
   interactivity delay on the favorite/progress controls for the entire
   rest of the page being cacheable.

This is more work than Groups 1–2 (a real component split, plus a new
client-fetch path), but it's the highest-value item in the whole rendering
strategy: `docs/baseline/bundle.md` and the route list both point at detail
pages as the most-visited, highest-fan-out part of the app (every
recommendation, search result, and library entry links to one), and today
every single view — anonymous or not — is a function invocation plus, for
season/episode pages, an unconditional database query.

`/movie/[id]/reviews`, `/movie/[id]/images`, `/tv/show/[id]/reviews` read no
session at all already (per `BEHAVIOR.md`) — these can move straight to
ISR (24h/12h matching their own TMDB cache windows) with no overlay-split
needed; they were only pinned `force-dynamic` for no data-dependent reason,
same pattern as `/lists/[id]`.

## Group 5: Genuinely per-user — stays dynamic, no change

`/profile`, `/profile/edit`, `/profile/statistics`,
`/profile/favorites/[mediaType]`, `/movies` (bare), `/tv-shows` (bare),
`/watchlist`, `/explore`, `/admin`, `/login`, `/register`,
`/forgot-password`, `/reset-password`, `/verify-email`,
`/verify-email-change`, `/contact`, all API route handlers. These
genuinely need per-request execution — real per-user data, or (for the
auth pages) side-effecting token consumption that must never be cached or
prefetched. No change recommended; correctly dynamic today.

**One exception worth a second look, not a change today:** public profile
pages (`/profile/[username]` and its `favorites`/`followers`/`following`
subroutes) are per-*profile*, not per-*viewer* — `BEHAVIOR.md` notes these
could in principle be ISR'd per username with a moderate window. Lower
priority than Groups 1–4 (profile pages are less trafficked than Home or
detail pages) but the same technique applies if it's worth the effort
later.

## Quantified expectation

Home and the four detail-page families (movie, TV show, season, episode)
are, by nature of the product (every discovery surface and every library
entry links into them), very likely the highest-volume routes in the app.
Moving all of Group 1, 2, and 4 off per-request function invocations
addresses the specific finding in `docs/baseline/cost-model.md` that the
1% DAU scenario alone is already 4.5× over Vercel Hobby's monthly
invocation cap — this is the change with the most direct line back to that
number, ahead of anything else identified across Phases 1–3.

## What this doesn't fix

None of the above touches the ~143 KB gzip client-JS floor every route pays
regardless of rendering mode (`docs/baseline/bundle.md`) — that's a
separate, UI-library-level decision, addressed in
`docs/refactor/ui-library-decision.md`. It also doesn't address Neon
compute-hours directly except indirectly: fewer DB-touching page renders
means more opportunities for the 5-minute autosuspend window to actually
occur, which is the real lever `docs/baseline/cost-model.md` identified for
that constraint.
