# Dependency graph and folder-boundary violations

Checked against AGENTS.md's "Folder Boundaries" section using `madge`
(circular-dependency detection and full dependency graph, `--ts-config
tsconfig.json` so the `lib/*` path alias resolves correctly) plus targeted
greps for the specific boundary rules AGENTS.md states explicitly.

## Circular dependencies: none

```
pnpm dlx madge --circular --extensions ts,tsx --ts-config tsconfig.json src/
✔ No circular dependency found!
```

Clean result across all 284 source files. Worth stating plainly since it's
good news, not just an absence of findings: whatever else this refactor
touches, there's no import cycle to untangle first.

## Most depended-upon files — where a mistake costs the most

Fan-in computed from the full dependency graph (how many other files import
each one). These are the files where the refactor should move carefully —
a mistake here has the widest blast radius:

| File | Imported by |
| --- | --- |
| `lib/types/index.ts` | 61 files |
| `lib/components/shared/PageShell.tsx` | 25 |
| `lib/services/auth/session.server.ts` | 25 |
| `lib/services/database/tracking.server.ts` | 22 |
| `lib/services/tmdb/constants.ts` | 21 |
| `lib/services/tmdb/utils.server.ts` | 18 |
| `lib/components/shared/Section.tsx` | 17 |
| `lib/services/tmdb/normalize.ts` | 15 |
| `lib/services/database/auth.server.ts` | 12 |
| `lib/services/tmdb/movie/list/types.ts` | 12 |

`lib/types/index.ts`'s 61 importers is a clean barrel re-export (`export
type {...} from 'lib/types/media'`, etc.) — not a smell on its own, just the
reason `knip` flags some of the same type names as "unused" in both
`media.ts`/`user.ts` and the barrel: they're the same re-exported symbols,
and knip's per-file detection doesn't always collapse that. Noted here so
it isn't mistaken for a second dead-code finding beyond what
`docs/refactor/dead-code.md` already covers.

## Violation: route files with real UI content instead of thin delegation

AGENTS.md: "Keep route files in `src/app` thin; route UI belongs in
`src/lib/pages`." True for every route checked while writing `BEHAVIOR.md`
**except two**: `src/app/privacy/page.tsx` (180 lines — the single largest
route file in the app) and `src/app/terms/page.tsx` (77 lines) contain the
entire legal-text content directly as JSX children in the route file
itself, rather than delegating to a component in `lib/pages/legal`. Every
other large route file (episode detail at 169 lines, `/profile` at 163)
earns its size from legitimate route-level concerns — data fetching,
`Promise.all` orchestration, degradation fallbacks — not from holding UI
content that belongs elsewhere. `lib/pages/legal` already exists and
exports the `LegalPage`/`LegalSection` wrapper components these two routes
use; only the actual paragraph content needs moving into it (e.g.
`lib/pages/legal/privacy-content.tsx`/`terms-content.tsx`).

## Violation: a shared component living under one media type's folder

`AGENTS.md` doesn't explicitly forbid this pattern by name, but it directly
contradicts the intent of having a dedicated `lib/components/shared`
location for exactly this case. `BackButton` is defined at
`lib/pages/movie/detail/components/back-button.tsx` and imported
cross-boundary by two TV files:

- `lib/pages/tv/episode/detail/index.tsx`
- `lib/pages/tv/season/detail/index.tsx`

Nothing about `BackButton` is movie-specific (confirmed while writing
`docs/refactor/duplication.md` — it's exactly the kind of small, generic
component that pattern document's "already done right" section describes).
It should move to `lib/components/shared/`, matching where
`MediaReviewsPage`, `Section`, and `PosterCard` already live. Low risk, pure
file move plus two import path updates.

## Feature-module boundary is blurrier than AGENTS.md's listing implies

AGENTS.md lists `auth`, `contact`, `library`, `profile`, `reviews`, `social`,
`tracking`, and `watchlist` under `src/lib/features` as if they were
independent modules. Checking actual cross-imports between them:

- `features/library` imports from `features/profile` (`favorite-actions`)
  **and** `features/watchlist` (`actions`)
- `features/profile` imports from `features/library`
  (`media-card-hydration.server`)
- `features/tracking` imports from `features/library`
  (`tv-library.server`, `tv-library-state`)

`library` and `profile` import from each other (different files in each
direction, so not a file-level cycle — `madge` correctly reports none — but
a genuine bidirectional coupling at the module level). This is consistent
with `docs/refactor/dead-code.md`'s finding of superseded CRUD wrappers in
`tracking.server.ts` and an unused `getWatchlistSavedState` in
`features/watchlist/actions.ts`: `library`, `tracking`, and `watchlist`
have overlapping responsibility for "what does the current user have saved
and what's their progress," and the boundary between them has blurred
across however many feature passes added to each independently. Not a bug —
nothing is broken — but worth an explicit decision during the refactor
about which module owns what, rather than continuing to add to whichever
one happens to be open.

## Client/server boundary: no violations found

Checked every `'use client'` file for a *value* import (not `import type`)
from a `.server.ts` module, which the `server-only` package should already
make a hard build error. Found exactly two `.server.ts` references in
client components (`lib/pages/admin/curated-lists.tsx`,
`lib/pages/admin/moderation.tsx`) — both `import type` only, which erases at
compile time and correctly doesn't pull in the server module or trip
`server-only`'s guard. The boundary is being enforced correctly everywhere
it was checked; nothing to fix here.

## Summary

| Finding | Severity | Fix cost |
| --- | --- | --- |
| No circular dependencies | — (positive) | — |
| `/privacy`, `/terms` hold content that belongs in `lib/pages/legal` | Low — cosmetic/organizational, not a bug | Small — move JSX into two new components |
| `BackButton` lives under `pages/movie`, used by `pages/tv` | Low | Trivial — one file move, two import updates |
| `library`/`profile`/`tracking`/`watchlist` cross-import each other | Medium — no bug today, but the boundary this refactor is meant to clarify has already blurred | Needs a decision, not just a move — see `docs/refactor/dead-code.md`'s superseded-wrapper findings for the concrete symptom |
| Client/server boundary enforcement | — (positive) | — |
