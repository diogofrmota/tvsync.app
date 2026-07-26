# Dead code and unused schema

`knip` was already a dependency with no script wired up — added `"knip": "knip"`
to `package.json`. Run with `pnpm knip`. Full run: 16 unused files, 45 unused
exports, 54 unused exported types, 0 unused dependencies.

## Unused files (16) — classified

| File | Verdict | Why |
| --- | --- | --- |
| `src/lib/services/tmdb/certification.ts` | **keep, documented** | AGENTS.md states this explicitly: "The detail routes no longer fetch `/tv/{id}/content_ratings` or `/movie/{id}/release_dates` — nothing renders a certificate — although `selectPreferredCertification` and both endpoint helpers stay in the service layer." Intentional, not an oversight. |
| `movie/release-dates/{index.server,types,utils}.ts` (3 files) | **keep, documented** | Same AGENTS.md note as above — the certification feature's TMDB endpoint helper, kept deliberately. |
| `tv/content-ratings/{index.server,types,utils}.ts` (3 files) | **keep, documented** | Same. |
| `movie/providers/{index.server,types,utils}.ts` (3 files) | **needs-review — doc drift** | Not mentioned in AGENTS.md's "no longer fetches" note. `readme.md` describes "regional movie watch providers" as a **current** typed TMDB helper, but nothing in the app calls it — a real mismatch between `readme.md` and the code, separate from the intentionally-kept certification files. Decide once: is this coming back, or should `readme.md` be corrected and the files deleted? |
| `tv/providers/{index.server,types,utils}.ts` (3 files) | **needs-review — doc drift** | Same as movie/providers. |
| `src/lib/components/shared/SliderContainer.tsx` | **safe to delete** | A generic rail container with a "see more" pattern, superseded by `Section.tsx`/`PosterCard.tsx`'s equivalent (both use the same `Button asChild` + `seeAllHref` shape seen elsewhere in the codebase). No references anywhere. |
| `src/lib/utils/count-age.ts` | **safe to delete** | A birth/death-date age calculator — for a person-detail page. `tests/movie-detail-ux.test.ts` confirms "cast list is shown but no longer links to per-person pages," i.e., person pages were removed from the product and this is the orphaned remainder. |
| `tests/e2e/mocks/tmdb-mock-server.mjs` | **false positive — keep** | Referenced by `playwright.config.ts`'s `webServer.command` as a shell string (`node tests/e2e/mocks/tmdb-mock-server.mjs`), not an ES import, so knip's static import graph can't see the reference. Genuinely used; a knip config tweak (`entry` patterns including this file) would silence it if this list is re-run regularly. |

## Unused exports (45) and unused exported types (54)

These split into two genuinely different categories, and conflating them
overstates how much is actually dead:

**Category A — exported but only used within their own file (not real dead
code, just an unnecessary `export`).** Example: `hydrateMediaCardItem`
(singular) in `media-card-hydration.server.ts` is exported but only ever
called by `hydrateMediaCardItems` (plural) in the same file via
`.map(hydrateMediaCardItem)` — the plural wrapper is what every other module
imports. Same pattern for `ResendVerificationForm` in `lib/pages/auth/forms.tsx`
(rendered inline in the same file's `RegisterAuthPage`, never imported
elsewhere) and several of the `type` exports in `lib/services/database/
tracking.server.ts` (input/row shapes used only as that file's own internal
parameter types). This category is a 30-second fix each — drop the `export`
keyword — not a deletion decision.

**Category B — genuinely called nowhere in the app.** The more interesting
group, and worth calling out by name:

- **The entire color-mode-switching API is dead**: `useColorMode`,
  `useColorModeValue`, `ColorModeIcon`, `ColorModeButton`, `LightMode`,
  `DarkMode`, plus their types (`ColorMode`, `UseColorModeReturn`,
  `ColorModeProviderProps`) in `src/lib/components/ui/color-mode.tsx`.
  `lib/components/ui/provider.tsx` renders `<ColorModeProvider
  defaultTheme="dark" forcedTheme="dark">` — the theme is hardcoded, so
  nothing in the app ever needs to read or toggle it. This is a whole
  feature surface (dark/light switching) that's fully wired up in the
  component but has zero callers, because the product decision to force
  dark mode already made it moot.
- **A cluster of superseded CRUD wrappers in `tracking.server.ts`**:
  `upsertOwnProfile`, `deleteOwnMedia`, `listPublicMediaForProfile` (this one
  is genuinely surprising — it's the exact function measured in
  `docs/baseline/queries.md`'s query baseline, and it has zero callers in
  `src/lib/features/` or `src/app/`), `upsertOwnEpisodeProgress`,
  `upsertOwnWatchlistItem`, `getOwnWatchlistItem`, `deleteOwnWatchlistItem`,
  `assertCurrentUserCanAccessUserRecords`. Cross-checked directly against
  `src/lib/features/` and `src/app/` — none of these are called from
  application code. The app's real watchlist/library mutations go through
  the combined queries in `library-queries.ts`
  (`ADD_OWN_LIBRARY_ITEM_QUERY`, `REMOVE_OWN_LIBRARY_ITEM_QUERY`,
  `SET_OWN_TV_LIBRARY_STATE_QUERY`) instead. These read like an earlier,
  single-item-at-a-time API that a later refactor toward
  combined/transactional queries superseded without removing the originals —
  a textbook "too many feature passes, nobody circled back" artifact,
  exactly the kind this whole audit is for.
- `getWatchlistSavedState` (`lib/features/watchlist/actions.ts`) — no
  callers anywhere.
- The remaining ~35 unused exports/types are smaller constants and row/input
  type shapes (`DEFAULT_TMDB_API_URL`, `PASSWORD_MIN_LENGTH`/`MAX_LENGTH`/
  `MAX_BYTES`, `AUTH_RATE_LIMITS`, `DUMMY_PASSWORD_HASH`,
  `ADMIN_AUDIT_LOG_RETENTION_DAYS`, `CURATED_LISTS_TAG`,
  `DISCOVERY_LIST_SETTINGS_TAG`, various `*Row`/`*Input`/`*Result` types in
  `tracking.server.ts`, `privacy.server.ts`, `profile.server.ts`, and the
  `useMovieRecommendations`/`useTrendingMovies`/`useTVShowByList`/
  `useTrendingTVShows` client hooks) — low individual risk either way; group
  them with whichever of the two categories above they turn out to match
  once someone's actually touching that file, rather than triaging all ~35
  in isolation right now.

## Dead schema

Cross-checked every table name in `database/migrations/*.sql` against
`grep -rl` usage in `src/lib/services/database/*.ts`:

| Table | Referenced in DB service files |
| --- | --- |
| `custom_lists` | **0** |
| `custom_list_items` | **0** |
| every other table (18 total) | 1–12 |

Confirms exactly what AGENTS.md already states: "Personalized lists were
removed from the product. `database/migrations/0010_personalized_lists.sql`
stays in the migration history so applied databases keep matching the
recorded migrations, but `custom_lists` and `custom_list_items` are no
longer read or written by the app." No other whole table is dead.

**Column-level check didn't produce a reliable result and isn't included as
a finding.** A simple `grep` for each column name against the database
service layer can't distinguish "this column for this table is genuinely
unused" from "this word happens to also be a column name on a different
table" (e.g., `name`, `position`, `note` are reused across several tables).
Every non-generic column across all 18 real tables showed at least one
grep hit, which is exactly the ambiguous result that check produces whether
or not a dead column actually exists — it needs a check scoped to each
table's own queries specifically, not a codebase-wide grep, to be worth
reporting as a finding.

## Summary: what to actually do before/during the refactor

- **Delete now, low risk**: `SliderContainer.tsx`, `count-age.ts`.
- **One decision needed, then act**: the six `movie/providers` +
  `tv/providers` files — either wire up watch-provider display (matching
  what `readme.md` currently implies exists) or delete them and fix the
  `readme.md` claim. Don't leave the mismatch as-is through a refactor.
- **Keep as documented**: `certification.ts` and the release-dates/
  content-ratings TMDB helpers — AGENTS.md already made this call
  explicitly; the refactor should preserve that decision, not "clean up"
  something that was already a deliberate keep.
- **Delete the entire color-mode API** (`color-mode.tsx`'s public exports) —
  the app is dark-mode-only by design; carrying a full light/dark toggle
  surface that can never be invoked is pure weight for no reason.
- **Delete the superseded `tracking.server.ts` CRUD wrappers** —
  `upsertOwnProfile`, `deleteOwnMedia`, `listPublicMediaForProfile`,
  `upsertOwnEpisodeProgress`, `upsertOwnWatchlistItem`,
  `getOwnWatchlistItem`, `deleteOwnWatchlistItem`,
  `assertCurrentUserCanAccessUserRecords`, and `getWatchlistSavedState`. Note
  for whoever does this: `listPublicMediaForProfile` and
  `getOwnWatchlistItem` are two of the nine queries measured in
  `docs/baseline/queries.md` — that baseline was written against what the
  code currently exports, not what's actually called, so re-verify the
  measured query list still matches real call sites after this cleanup.
- **Drop the unnecessary `export` keyword** on the Category-A items
  (`hydrateMediaCardItem`, `ResendVerificationForm`, and the
  internal-only `tracking.server.ts` types) — no behavior change, just
  stops them showing up as false "unused" noise on the next `knip` run.
