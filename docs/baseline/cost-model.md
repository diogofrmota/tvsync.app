# Cost model: 1M users on Vercel Hobby + Neon Free

## Sources

Vercel's and Neon's own docs pages returned HTTP 403 to this session's fetch
tool (likely bot-blocking, not a real access issue), so the figures below
come from web search results cross-referencing multiple independent
secondary sources for Vercel, and directly from Neon's own FAQ markdown
served via GitHub raw content (fetchable, unlike the rendered docs site).
Confirm the Vercel figures against
[vercel.com/docs/limits/overview](https://vercel.com/docs/limits/overview)
and
[vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations)
directly before treating them as final — they're consistent across sources
here, but a login-gated fetch would be more authoritative than search
snippets.

**Vercel Hobby** (as of mid-2026): 1,000,000 function invocations/month,
360 GB-hours provisioned memory, 4 hours Active CPU time/month, 100 GB Fast
Data Transfer/month, 1,000,000 Edge Requests/month. **Hobby is restricted to
personal, non-commercial use — a project generating revenue must upgrade to
Pro regardless of whether it stays under every technical limit.**

**Neon Free** (confirmed via Neon's own FAQ): 100 CU-hours compute per
project per month, 0.5 GB storage per project, 10 branches per project,
5 GB public data transfer per project per month, autosuspend after 5 minutes
of inactivity, scales 0.25–2 CU (≈1–8 GB RAM) when active.

## Assumptions

- 1,000,000 registered users (the user's stated target).
- Three DAU scenarios: 1% (10,000), 5% (50,000), 20% (200,000) daily active
  users — engagement for a tracking app plausibly lands in this range;
  stating it explicitly rather than picking one number to hide how much the
  conclusion depends on it.
- 10 pageviews per session as a round, moderate estimate for a
  browse-and-track app.
- Per BEHAVIOR.md: 20 of 43 routes are `force-dynamic`, so a view of any of
  those is a serverless function invocation. The `/api/tmdb/[[...path]]`
  proxy route is a *separate* function invocation from the page render
  itself whenever a client component fetches through it (search-as-you-type,
  client-side library badges) — so "1 pageview" is not reliably "1
  invocation"; it's at least 1, plausibly 1.5–2 with proxy calls included.
  Numbers below use a conservative 1.5× multiplier on raw pageviews and say
  so explicitly rather than quietly assuming 1:1.
- Images are hotlinked directly to `image.tmdb.org` — the app has no
  `next/image` usage or configured remote patterns anywhere in the codebase
  — so poster/backdrop bytes never touch Vercel's bandwidth or Image
  Optimization pipeline at all. This meaningfully helps the bandwidth side
  of this model; it's already the cost-conscious choice.

## Vercel: function invocations

| DAU | Monthly pageviews (×10/session ×30d) | Invocations (×1.5) | % of 1M/month cap |
| --- | --- | --- | --- |
| 10,000 (1%) | 3,000,000 | 4,500,000 | **450%** |
| 50,000 (5%) | 15,000,000 | 22,500,000 | **2,250%** |
| 200,000 (20%) | 60,000,000 | 90,000,000 | **9,000%** |

**Even the 1% DAU scenario blows past the 1,000,000/month invocation cap by
4.5×.** This isn't a scaling concern that shows up at some large fraction of
1M users — it breaks almost immediately once any meaningful fraction of the
user base is actually active, because 20 routes render dynamically per view
with no ISR/static caching underneath the *route* layer (the Data Cache
inside those routes helps the TMDB/Neon calls, per BEHAVIOR.md's caching
notes, but does nothing for the invocation count itself, which is what this
limit is measured against).

## Vercel: Active CPU time / GB-hours

Active CPU time (the more binding of Vercel's two compute limits — 4
hours/month total) is harder to estimate precisely without a real
production trace, but the invocation math alone already establishes the
invocation cap breaks first and by a wide margin, so a precise CPU-time
number doesn't change the conclusion here. Flagging it as a second
constraint worth measuring for real once the app is deployed and generating
actual Vercel usage data, rather than estimating further from a sandbox.

## Neon: compute hours — the more interesting constraint

This is the sharper, more decision-relevant finding, and it doesn't actually
depend much on the DAU numbers above.

Neon's free compute auto-suspends after **5 minutes of inactivity**. The
free budget is **100 CU-hours/month**, which is enough for a compute pinned
at the minimum 0.25 CU to run roughly **400 hours** — a bit over half a
month if it ran continuously.

The question that matters isn't "how much total compute time do queries
use" (per `docs/baseline/queries.md`, every hot-path query resolves in
low-single-digit milliseconds — query time itself is not the bottleneck).
It's **"how often does a 5-minute gap with zero requests actually occur?"**
Every request that reaches a database call resets the idle clock. At even
modest sustained traffic — and Home's curated rails, the public detail-page
rating aggregate, and the season/episode progress checks (BEHAVIOR.md: these
run unconditionally even for anonymous viewers, just discarding the result)
all touch the database — a 5-minute gap with *zero* qualifying requests
becomes unlikely well before 1% of 1M users are active. If the compute
effectively never sleeps, it runs close to 24/7: **~720 hours/month at
minimum size, versus a ~400-hour budget** — over the limit by roughly 80%
purely from staying awake, before counting a single unit of actual query
work.

**This is the constraint most likely to break first, and it can break at
traffic far below "1M users are active" — it breaks as soon as request
frequency is high enough to prevent the compute from ever reaching its
5-minute idle window.** Reducing per-request database dependency (the
Phase 4.1 rendering-strategy work already flagged in `PRE_REFACTOR.md` and
`BEHAVIOR.md` — moving the public, uniform pages to ISR so they stop hitting
Neon on every anonymous view) directly extends the number of idle windows
the compute gets, which is the actual lever here — not query optimization,
since the queries are already fast.

## Storage

0.5 GB free storage is the tightest *absolute* number here, independent of
traffic. `docs/baseline/queries.md`'s seed (100k profiles, 1M `user_media`
rows, 1M `episode_progress` rows, 200k ratings, 400k watchlist_items) is a
plausible shape for a fraction of 1M registered users' data and would need
checking against actual row sizes and index overhead to know how close to
0.5 GB it lands — worth a follow-up measurement (`\l+`/`pg_database_size` on
the seeded PGlite instance) if this baseline is extended.

## Bottom line

Ranked by which breaks first as traffic grows from zero:

1. **Neon compute-hours** — breaks first, and earliest, because it's gated
   by request *frequency* (does a 5-minute gap ever occur), not cumulative
   volume. Likely breaks at low single-digit-percent DAU or less.
2. **Vercel function invocations** — breaks next, gated by pageview volume;
   the 1% DAU scenario alone is already 4.5× over the monthly cap.
3. **Vercel Active CPU time** — plausible second- or third-place constraint;
   not modeled precisely here, worth measuring from real production traces.
4. **Neon storage (0.5 GB)** — the tightest absolute ceiling, but the least
   traffic-sensitive; it caps total registered-user data volume rather than
   activity.

**1M users on Vercel Hobby + Neon Free, as the app is architected today, is
not realistic even at 1% DAU.** That is not a reason to abandon the target —
it's the concrete evidence for why Phase 4.1 (rendering strategy: move
`/`, `/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]`, and
`/lists/[id]` off `force-dynamic` to ISR, and split the per-user overlay on
detail/season/episode pages into a client-fetched call) is the highest-
leverage single change available before spending effort anywhere else in
the refactor. It's also worth being direct about the plan's ceiling
regardless of technical headroom: **Hobby's terms restrict it to
non-commercial use**, which may decide the free-vs-paid question
independently of whatever these numbers show once the app is generating
revenue or is otherwise a commercial product.
