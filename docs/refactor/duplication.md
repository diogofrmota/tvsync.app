# Duplication map: movie vs TV pipelines, and beyond

Four areas compared, per the original brief: the TMDB service layer
(`movie/**` vs `tv/**`), the page component trees (`pages/movie` vs
`pages/tv`), the database `*-queries.ts`/`*.server.ts` split, and the
`features/*` modules. The goal is to separate **genuine duplication**
(same logic, different type names — safe and cheap to unify) from
**structural similarity that hides a real domain difference** (movies and
TV shows are not the same shape of thing, and forcing them into one
function would just relocate the special-casing rather than remove it).

## Already done right — the model to follow

Two things are already properly unified across movie and TV, and are worth
naming explicitly so the refactor doesn't accidentally regress them while
"cleaning up" everything else:

- **`lib/services/tmdb/reviews.ts`** — one `MediaReview`/
  `normalizeMediaReviewsResponse` used by both `movie/reviews` and
  `tv/reviews`. TMDB's review shape genuinely is identical between media
  types, and the code reflects that with a single shared module instead of
  two copies.
- **`lib/pages/media/reviews.tsx`** (`MediaReviewsPage`) — one component
  rendering both `/movie/[id]/reviews` and `/tv/show/[id]/reviews`
  (confirmed in `BEHAVIOR.md`'s route table), parameterized by
  `backHref`/`backLabel`/`title` rather than duplicated per media type.

Any unification work below should end up looking like these two — a single
shared implementation with a thin per-media-type call site — not a
generic-with-many-conditionals monster.

## Genuine duplication — safe to unify, low risk

| Pair | Similarity | Real difference | Verdict |
| --- | --- | --- | --- |
| `movie/videos/utils.ts` ↔ `tv/videos/utils.ts` | Line-for-line identical logic (`normalize*VideosResponse`, `isTrustedYoutubeTrailer`, `select*Trailer`) | Only type names (`MovieVideo`/`TvVideo`) and generic parameters | **Unify.** A single `normalizeVideosResponse<T>`/`selectTrustedTrailer<T>` generic pair removes ~35–40 duplicated lines with zero information loss. |
| `pages/movie/detail/components/trailer.tsx` ↔ `pages/tv/detail/components/trailer.tsx` | Identical JSX, identical `AspectRatio`/`iframe` structure | Only the component name, the video type, and one fallback string (`'Movie trailer'` vs `'TV show trailer'`) | **Unify.** A single `MediaTrailer` component taking `trailer` and a `mediaTypeLabel` string prop. ~20 lines removed, essentially zero behavioral risk since the diff is purely cosmetic. |
| `pages/movie/detail/components/casts-wrapper.tsx` ↔ `pages/tv/detail/components/casts-wrapper.tsx` | Identical rendering logic and the exact same fields read (`id`, `name`, `character`, `profile_path`) | Only variable naming (`movieCast` vs `tvCast`) and the credits response type | **Unify.** Neither version reads the fields that genuinely differ between `MovieCreditsResponse` and `TVCreditsResponse` (`cast_id` on movies; `roles`/`total_episode_count` on TV) — the wrapper only ever needed the common subset. Safe to merge into one `CastsWrapper` accepting either credits type, ~55 lines removed. |
| `movie/credits/utils.ts`'s `normalizePersonCredit` ↔ `tv/credits/utils.ts`'s `normalizePersonCredit` | Byte-for-byte identical 10-line helper, duplicated in both files | None — it's the same function | **Unify.** Extract to a shared `normalizePersonCredit` in `lib/services/tmdb/normalize.ts` (or similar). Trivial, ~10 lines, no risk. |
| `movie/detail/utils.ts`'s inline genre mapping ↔ `tv/detail/utils.ts`'s `normalizeGenre` | Identical 2-field shape (`id`, `name`) | None | **Unify if convenient, skip if not.** Only ~2–3 lines either way; low value, do it opportunistically rather than as its own task. |

**Total realistic savings from the clear wins: roughly 130–150 lines**, all
mechanical extraction with type-name changes only — the kind of change that
should ship alongside other work in the same files, not require a dedicated
migration.

## Looks similar, isn't — leave these alone

| Pair | Why it looks like duplication | The real difference |
| --- | --- | --- |
| `normalizeMovieListItem` ↔ `normalizeTVShowItem` | Same normalization pattern, same helper functions (`normalizeText`, `normalizeImagePath`, etc.) | Genuinely different fields: movies have `adult`, `title`/`original_title`, `release_date`, `video`; TV has `name`/`original_name`, `first_air_date`, `origin_country`. `normalizeMovieListResponse` also wraps an extra `dates: {maximum, minimum}` block TMDB only returns for movie lists. Forcing one function here means a pile of `mediaType === 'movie' ? … : …` branches replacing what's currently two honest, readable functions. |
| `movieListEndpoint` ↔ `tvShowListEndpoint` | Same branching *shape* (free-text query → search path, `trending_week` → trending path, filter params present → discover path, else → section path) | Movies support a free-text search branch through this same endpoint-builder that TV does not (TV search is a separate path, `TV_SHOW_SEARCH_RESOURCE_PATH`, called from a different function entirely). A shared `buildListEndpoint` is *plausible* but needs to model that asymmetry explicitly rather than pretend it doesn't exist — moderate, not high, priority. |
| `movie/credits` outer response normalizer ↔ `tv/credits` outer response normalizer | Same overall structure (`{ id, cast, crew }`, same inner helper) | TV credits carry `roles`/`jobs` arrays (a person's recurring appearances across episodes) and `total_episode_count`; movies carry `cast_id` instead. This is real domain information TV has and movies don't (a season has many episodes; a movie doesn't), not accidental drift. Keep separate. |
| `movie-library-state.ts` (33 lines) ↔ `tv-library-state.ts` (241 lines) | Same *responsibility* — optimistic client-side list state for a media library tab | The 7× size difference is real, not padding: TV state reconciles season/episode-level progress against show-level status (per `AGENTS.md`: movies only support `planned`/`watched`; TV supports `planned`/`watching`/`completed`/`dropped`/`paused` plus per-episode tracking). Movies have no episode data to reconcile at all. Don't force a shared abstraction that would need to model episode reconciliation for a media type that has no episodes. |
| `*-queries.ts` / `*.server.ts` split (`profile-queries.ts`/`profile.server.ts`, `auth-queries.ts`/`auth.server.ts`, etc.) | Reads like an odd double-file convention for every DB module | **Not duplication at all** — it's deliberate. `profile-queries.ts`'s own docstring: "Parameterized profile/account queries shared by Neon services and PostgreSQL tests." `tests/auth-database.test.ts` imports the exact same query constants (`CONSUME_AUTH_RATE_LIMIT_QUERY`, `FIND_CREDENTIAL_ACCOUNT_QUERY`, etc.) that `auth.server.ts` runs against Neon, guaranteeing the test suite validates the real SQL rather than a hand-copied approximation. This is the correct pattern and should be **preserved**, not "cleaned up." |

## One inconsistency worth flagging (not duplication, a pattern gap)

`tracking.server.ts` — the largest, highest-traffic database file — does
**not** follow the `*-queries.ts` convention the rest of the database layer
uses. It writes SQL inline via tagged templates (`sql\`...\``, 26
occurrences) rather than exporting named, independently-testable query
constants the way `auth-queries.ts`, `profile-queries.ts`,
`social-queries.ts`, `privacy-queries.ts`, `admin-queries.ts`,
`admin-curated-list-queries.ts`, `discovery-list-queries.ts`, and
`library-queries.ts` all do. This isn't duplication, but it is the one file
where the codebase's own established convention for testability wasn't
applied — worth a look during the refactor for consistency, independent of
anything else in this document.

## Bottom line

Of the four things this document was asked to compare, only the TMDB
service layer and the page-component layer had *real*, safe-to-remove
duplication — and even there, only about half of what superficially looks
duplicated actually is. The database query split and the library/tracking
state-management split both turned out to be intentional and correct on
inspection, which matters for scoping the refactor: this app's "too many
feature passes" problem shows up more as dead code (see
`docs/refactor/dead-code.md`) and route/rendering-strategy debt (see
`BEHAVIOR.md`) than as copy-pasted business logic. Don't spend refactor
budget hunting for movie/TV duplication beyond the five items in the first
table above — there isn't much more there to find.
