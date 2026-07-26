# Database query baseline

Measured with `EXPLAIN (ANALYZE, BUFFERS)` against PGlite (real Postgres via
WASM, same engine used by the existing `tests/*.test.ts` PGlite scenarios),
with all 13 migrations applied and seeded to a realistic volume:

| Table | Seeded rows | Modeling |
| --- | --- | --- |
| `profiles` | 100,000 | Full registered-user population. 1 in 5 set to `privacy_setting = 'private'`. |
| `user_media` | 1,000,000 | 20,000 "active" users × 50 rows each — not all 100k users seeded uniformly, since real usage skews toward a minority of active accounts. |
| `episode_progress` | 1,000,000 | 5,000 "power users" × 200 rows each. |
| `ratings` | 200,000 | 20,000 users × 10 ratings each. |
| `watchlist_items` | 400,000 | 20,000 users × 20 items each. |

This is a stand-in for a real Neon branch — this sandbox has no network
access to provision one — but PGlite runs genuine Postgres, so the query
planner's behavior (index selection, seq scans, join strategy) is real, not
simulated. The one thing this can't validate is Neon-specific behavior:
connection/cold-start latency, its serverless HTTP driver overhead, and
autoscaling compute behavior under load. Re-running the same script (see
below) against an actual Neon branch would confirm the planner picks the same
indexes at real data volume and surface anything PGlite can't.

## Results

Nine read paths from `src/lib/services/database/tracking.server.ts` — chosen
because they're the highest-traffic reads in the app: personal library and
progress reads (hit on nearly every authenticated page view) and the public
rating aggregate (`getRatingSummary`, which runs on **every** movie/TV/season/
episode detail page view, authenticated or not).

| Query | Plan | Execution time |
| --- | --- | --- |
| `listOwnMedia` (personal library, no type filter) | Bitmap Index Scan on `user_media_user_date_added_idx` | 1.05 ms |
| `listOwnMediaByType` (movies only, capped 200) | Bitmap Index Scan on `user_media_user_date_added_idx` + filter | 0.31 ms |
| `listPublicMediaForProfile` (public profile, joins `profiles`) | Index Scan on `profiles_username_lower_unique`, nested loop into `user_media` | 0.09 ms |
| `listOwnEpisodeProgressForShow` | Index Scan on `episode_progress_user_episode_unique` | 0.11 ms |
| `listOwnEpisodeProgressForTvLibrary` (joins `user_media`) | Bitmap scan + Memoize + Index Scan on `episode_progress_user_show_idx` | 1.11 ms |
| `listOwnEpisodeProgressForSeason` | Index Scan on `episode_progress_user_episode_unique` | 0.03 ms |
| `getRatingSummary` (public aggregate, every detail-page view) | Index Scan on `ratings_media_lookup_idx` | 0.15 ms |
| `listOwnWatchlistItems` (capped 200) | Bitmap Index Scan on `watchlist_items_user_date_added_idx` | 0.16 ms |
| `getOwnWatchlistItem` (single-row lookup) | Index Scan on `watchlist_items_media_lookup_idx` + filter | 0.06 ms |

**Zero sequential scans across all nine queries**, at 1M+ rows in the
tables that matter most (`user_media`, `episode_progress`). Every query in
this app's hottest path resolves through an index. This is a genuinely clean
result — the indexes AGENTS.md documents ("Common owner, media, status,
public-read, and date ordering lookups should have matching indexes before
related UI or API work ships") are in fact in place and doing their job.

## One thing worth checking against real skew

`getOwnWatchlistItem`'s exact filter is `user_id = ? and tmdb_id = ? and
media_type = ?` — precisely the shape of the `(user_id, tmdb_id, media_type)`
**unique constraint** on `watchlist_items` (`watchlist_items_user_tmdb_media_
unique` in `0001_initial_tracking_schema.sql`), which is the theoretically
optimal index for this lookup. The planner instead chose
`watchlist_items_media_lookup_idx` (`tmdb_id, media_type`) with a post-filter
on `user_id`. At this seed's cardinality (roughly 40 watchlist rows per
`(tmdb_id, media_type)` pair on average — `tmdb_id` only ranges 1–5,000 here),
that's cheap enough not to matter (63 μs). It's worth re-checking with a
skewed seed modeling one or two extremely popular titles — a blockbuster
watchlisted by hundreds of thousands of users would make the `(tmdb_id,
media_type)` index scan far more rows before the `user_id` filter narrows it
down, versus the unique constraint's index which would stay effectively O(1)
regardless of a title's popularity. Not urgent, but a cheap thing to verify
before or during the refactor rather than assuming today's plan holds at
real skew.

## What wasn't covered in this pass

`profile-queries.ts` (favorites listing), `social-queries.ts` (follow
lookups/counts), `admin-queries.ts`, and the privacy "download my data"
queries in `privacy-queries.ts` weren't run through this harness — they're
lower-traffic than the tracking reads above (follow/favorites pages,
admin-only, or triggered by an explicit user action rather than every page
view). The same approach (PGlite + `EXPLAIN ANALYZE` against seeded volume)
applies directly if these need checking later; nothing about extending this
list requires new tooling.
