# Refactor plan

Synthesizes every document in `docs/baseline/` and `docs/refactor/` into an
ordered sequence of independently shippable, independently revertible
steps. Each step touches exactly one of: **rendering mode**, **file
structure**, **dead code**, **duplication**, **database schema**, or **UI
library** — never two at once, so a regression is always traceable to a
single kind of change. Ordered so the highest cost/latency wins
(`docs/baseline/cost-model.md`'s invocation-cap finding) land first, with
cosmetic reorganization after.

Every step lists: what changes, blast radius, which existing check catches
a regression, expected effect on the baselines in `docs/baseline/`, and how
to roll it back. "Verify: `pnpm test && pnpm test:e2e && pnpm build`" is
the baseline gate for every step and isn't repeated per row unless a step
needs something beyond it.

---

## Phase A — Rendering mode (do first: this is where the cost-model finding lives)

### A1. Remove the unnecessary `force-dynamic` pins

**Change**: drop `export const dynamic = 'force-dynamic'` from `/lists/[id]`,
`/privacy`, `/terms`, `/movie/[id]/reviews`, `/movie/[id]/images`,
`/tv/show/[id]/reviews`; add `export const revalidate = 300` to
`/lists/[id]` (matching `CURATED_LISTS_REVALIDATE_SECONDS`) and
`revalidate = 86400` to the three reviews/images routes (matching their
TMDB cache windows per `BEHAVIOR.md`). `/privacy`/`/terms` need no
`revalidate` at all — fully static.
**Blast radius**: 6 route files, zero shared code touched.
**Coverage**: `tests/e2e/media-detail.spec.ts` already exercises
movie/TV detail rendering; add a quick smoke check for `/lists/[id]` if not
already covered.
**Expected effect**: direct reduction in function invocations for these
six routes — the most literal instance of `docs/baseline/cost-model.md`'s
"invocation cap breaks at 1% DAU" finding.
**Rollback**: revert the file, re-add the pin. No data or schema
involved — trivially safe to revert at any time.

### A2. Move the `/` auth-redirect check into middleware

**Change**: per `docs/refactor/rendering-strategy.md`, add
`middleware.ts` matched to `/` that reads the session cookie and redirects
authenticated users to `/movies` before the page renders. Remove the
`getAuthSession()` call and redirect from `src/app/page.tsx`; add
`revalidate = 300`.
**Blast radius**: one new file (`middleware.ts`), one route file
simplified. No shared component changes.
**Coverage**: `tests/e2e/public-discovery.spec.ts`'s Home test plus a new
assertion that an authenticated session still redirects (needs
`E2E_REAL_DATABASE` per `tests/e2e/README.md`, or a lighter cookie-based
check).
**Expected effect**: the single biggest invocation-count win identified —
Home is very likely the app's highest-traffic anonymous route.
**Rollback**: delete `middleware.ts`, restore the page's redirect logic.

### A3. Split the personal overlay out of movie/TV detail pages

**Change**: per rendering-strategy Group 4 — remove
`isMovieDetailViewerAuthenticated()`/`isTvShowDetailViewerAuthenticated()`
from the page render path; add `revalidate = 86400`; add a client
`PersonalOverlay` component that fetches favorite/rating state on mount.
**Blast radius**: `movie/[id]/page.tsx`, `tv/show/[id]/page.tsx`, plus one
new client component and (likely) one small new route handler for the
client fetch. Does not touch season/episode pages (next step) or any
shared UI primitive.
**Coverage**: `tests/e2e/media-detail.spec.ts`'s "anonymous visitor sees a
login/register prompt" test needs updating to assert against the new
overlay component instead of server-rendered markup; add a signed-in
variant once `E2E_REAL_DATABASE` is available.
**Expected effect**: removes the cookie read forcing dynamic execution on
two of the highest-fan-out routes in the app (every recommendation,
search result, and library entry links here).
**Rollback**: revert the page files and delete the new overlay component;
no schema or route-path changes to unwind.

### A4. Split the personal overlay out of season/episode pages

**Change**: same technique as A3, applied to
`/tv/show/[id]/season/[seasonNumber]` and the episode route — remove the
unconditional `getSeasonProgressState()`/`getEpisodeProgressState()`/
`getTvProgressSummary()` calls from the page render path (per
`BEHAVIOR.md`, these already run and get discarded for anonymous
viewers — this step stops running them for free instead of adding new
behavior).
**Blast radius**: 2 route files, the `EpisodeProgressPanel`/season
progress display components become the client-fetch boundary.
**Coverage**: `tests/e2e/media-detail.spec.ts`'s season/episode tests;
`tests/e2e/library-mutations.spec.ts`'s watched-toggle tests once
`E2E_REAL_DATABASE` is available — these must keep passing since the
mutation path itself isn't changing, only where the initial read happens.
**Expected effect**: `docs/baseline/queries.md` measured these exact
queries as sub-millisecond, so the win here is invocation count and
removing unconditional DB round-trips for anonymous traffic, not query
speed.
**Rollback**: revert the two route files and the progress-display
components to their current server-side-read form.

### A5. Split `/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]`

**Change**: per rendering-strategy Group 3, separate the no-query
"popular overview" render path from the `searchParams`-driven filtered-list
path so the former can be ISR'd. This is real restructuring — do it last
within Phase A, once A1–A4 are validated and the team has a feel for the
pattern.
**Blast radius**: `movies/[section]/page.tsx`, `movies/genre/[genre]/
page.tsx`, `tv/[listType]/page.tsx`, and whatever split each needs
(possibly a new static sibling route or a restructured search-param read).
**Coverage**: `tests/e2e/public-discovery.spec.ts` covers all three
routes' popular/no-query case already.
**Expected effect**: same invocation-reduction category as A1, on three
more routes.
**Rollback**: revert to the single combined route handling both cases.

---

## Phase B — Dead code (cheap, safe, do before duplication/structure work)

### B1. Delete the two safe files

**Change**: delete `lib/components/shared/SliderContainer.tsx` and
`lib/utils/count-age.ts` per `docs/refactor/dead-code.md`.
**Blast radius**: 2 files, zero importers (confirmed by `knip`).
**Coverage**: `pnpm knip` re-run should show them gone; full test suite as
a backstop.
**Rollback**: `git revert`.

### B2. Delete the dead color-mode API

**Change**: remove `useColorMode`, `useColorModeValue`, `ColorModeIcon`,
`ColorModeButton`, `LightMode`, `DarkMode` and their types from
`color-mode.tsx`, keeping only `ColorModeProvider` (still required by
`provider.tsx`).
**Blast radius**: 1 file, confirmed zero external callers.
**Expected effect**: shrinks the one file every route's client bundle
already pays for via the root provider tree — small but free.
**Rollback**: `git revert`.

### B3. Delete the superseded `tracking.server.ts` wrappers

**Change**: remove `upsertOwnProfile`, `deleteOwnMedia`,
`listPublicMediaForProfile`, `upsertOwnEpisodeProgress`,
`upsertOwnWatchlistItem`, `getOwnWatchlistItem`, `deleteOwnWatchlistItem`,
`assertCurrentUserCanAccessUserRecords`, and `getWatchlistSavedState` (in
`features/watchlist/actions.ts`) — confirmed zero callers in
`src/lib/features`/`src/app`.
**Blast radius**: 2 files. **Note**: `listPublicMediaForProfile` and
`getOwnWatchlistItem` are two of the nine queries
`docs/baseline/queries.md` measured — re-run that baseline's `EXPLAIN
ANALYZE` harness afterward if these functions' removal changes which
queries represent the app's real hot paths (it shouldn't, since they had
no callers, but confirm rather than assume).
**Rollback**: `git revert`.

### B4. Drop the unnecessary `export` keywords

**Change**: `hydrateMediaCardItem`, `ResendVerificationForm`, and the
internal-only `tracking.server.ts` types lose their `export` (used only
within their own file).
**Blast radius**: 3 files, no behavior change at all — purely reduces
`knip` noise for future runs.
**Rollback**: trivial.

### B5. Decide the watch-providers question (decision, not mechanical)

**Not a code change by default** — per `docs/refactor/dead-code.md`,
`movie/providers`/`tv/providers` (6 files) are real doc drift: `readme.md`
calls them "current," nothing uses them. Needs a product decision (wire up
watch-provider display, or delete the files and correct `readme.md`)
before this becomes a mechanical step. Block this step on that decision
rather than guessing.

---

## Phase C — File structure and boundaries

### C1. Move `BackButton` to `components/shared`

**Change**: relocate `lib/pages/movie/detail/components/back-button.tsx`
to `lib/components/shared/BackButton.tsx`; update the 3 import sites
(1 in movie/detail, 2 in TV per `docs/refactor/boundaries.md`).
**Blast radius**: 1 file moved, 3 import paths updated. Zero behavior
change.
**Rollback**: move it back.

### C2. Thin `/privacy` and `/terms`

**Change**: move the legal-text JSX content out of
`src/app/privacy/page.tsx` (180 lines) and `src/app/terms/page.tsx` (77
lines) into `lib/pages/legal/privacy-content.tsx`/`terms-content.tsx`; the
route files become thin wrappers rendering those components, matching
every other route in the app.
**Blast radius**: 2 route files, 2 new page-layer files. No rendering
logic changes (A1 already made these static — this step is purely
organizational and can land before or after A1 independently).
**Coverage**: `tests/e2e/smoke.spec.ts`'s privacy-page test.
**Rollback**: move the JSX back into the route files.

### C3. Resolve the library/profile/tracking/watchlist boundary blur (decision, not mechanical)

Per `docs/refactor/boundaries.md`: these four feature modules cross-import
each other more than `AGENTS.md`'s listing implies. This needs an explicit
ownership decision (which module owns "what does the user have saved and
what's their progress") before any file gets moved — attempting to
"fix" this mechanically without that decision risks just relocating the
tangle. Flag as a design conversation, revisit once B3's dead-wrapper
removal has already simplified the picture.

---

## Phase D — Duplication (low risk, mechanical)

### D1. Unify video normalization + the trailer component

**Change**: per `docs/refactor/duplication.md`, generic
`normalizeVideosResponse<T>`/`selectTrustedTrailer<T>` replacing the
movie/TV duplicates; a single `MediaTrailer` component replacing
`movie/detail/components/trailer.tsx` and `tv/detail/components/
trailer.tsx`.
**Blast radius**: 4 files → 2 (2 service files, 2 components), ~55 lines
removed. Purely mechanical — the diffs were already confirmed
line-for-line identical aside from type names.
**Coverage**: existing `movie-detail-ux`/`tv-show-detail-ux` unit tests
plus `tests/e2e/media-detail.spec.ts`'s trailer-adjacent assertions.
**Rollback**: `git revert` — no data involved.

### D2. Unify the casts-wrapper component and `normalizePersonCredit`

**Change**: single `CastsWrapper` accepting either credits type (per
duplication.md, neither version reads the movie/TV-specific fields
anyway); extract the identical `normalizePersonCredit` helper to a shared
location.
**Blast radius**: 3 files touched, ~65 lines removed.
**Rollback**: `git revert`.

---

## Phase E — Database schema (careful, low urgency)

### E1. Drop `custom_lists`/`custom_list_items` via a new migration

**Change**: **do not edit or delete migration `0010`** — per `AGENTS.md`,
it must stay in history so applied databases keep matching the recorded
migration sequence. Add a new migration (`0014_drop_custom_lists.sql`)
that `DROP TABLE IF EXISTS custom_list_items, custom_lists`. Confirmed
zero references anywhere in `src/lib/services/database` per
`docs/refactor/dead-code.md`.
**Blast radius**: 1 new migration file, 0 application code (nothing reads
these tables today).
**Coverage**: run the new migration against a disposable Neon branch (or
PGlite, matching `docs/baseline/queries.md`'s harness) and confirm the
full migration sequence still applies cleanly end to end.
**Expected effect**: frees a small amount of the 0.5 GB Neon free-tier
storage ceiling (`docs/baseline/cost-model.md` flagged storage as the
tightest absolute number, independent of traffic).
**Rollback**: a follow-up migration re-creating the tables — genuinely
harder to reverse than any other step here, since it's the one
destructive, data-layer change in this whole plan. Confirm on a
disposable branch first; do not run directly against production without
that check.

**Follow-up, not a step**: `docs/refactor/dead-code.md`'s open question
about `getOwnWatchlistItem`'s index choice at real popularity skew is
worth checking once B3 is done and this function no longer exists to ask
the question about — re-verify against whichever code path actually
serves that lookup today.

---

## Phase F — UI library (gated on the spike; largest potential effort, lowest urgency)

### F1. The spike

**Change**: convert `/privacy` and `/terms` (already static after A1, thin
after C2) to Tailwind or CSS Modules instead of Chakra. Re-run
`docs/baseline/bundle.md`'s measurement method on just these two routes.
**Blast radius**: 2 files (post-C2, these are now small dedicated
components), zero shared code.
**Expected effect**: turns `docs/refactor/ui-library-decision.md`'s
estimate into a real number.
**Decision gate**: proceed to F2 only if the number justifies it — see
`ui-library-decision.md`'s Step 2.

### F2+. Incremental migration (only if F1 justifies it)

Order per `docs/refactor/ui-library-decision.md`: shared leaf components
(`PageShell`, `Section`, `PosterCard`, `PosterImage`) → the five
zero-client-signal files (already flagged for a `'use client'` removal
independent of this) → forms and optimistic-update widgets last, leaning
on the full E2E suite including the `E2E_REAL_DATABASE`-gated tests for
the mutation-heavy final group. Each component migrated is its own
independently revertible step — do not batch multiple components into one
change.

---

## Explicitly out of scope

- **Watch-provider UI** — blocked on Phase B5's product decision, not a
  refactor task by default.
- **Row-level security** — `AGENTS.md` already defers this explicitly
  ("If RLS is added later, document exactly how..."); nothing here changes
  that.
- **Person-detail pages** — confirmed removed from the product
  (`docs/refactor/dead-code.md`); not being restored as part of this
  refactor.
- **A new database provider or hosting platform** — this whole plan is
  scoped to making the current Vercel + Neon architecture work within free-
  tier limits, not replacing either.
- **Visual redesign** — the UI-library migration (Phase F) is a
  implementation-detail swap (Chakra → Tailwind/CSS), not a restyling; the
  product should look the same before and after.
- **New product features of any kind** — matches `AGENTS.md`'s existing
  "do not add major product features" rule, which this plan doesn't
  relax.
