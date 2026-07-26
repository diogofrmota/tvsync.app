# Pre-Refactoring Checklist

What to do **before** starting the structural refactor of TvSync.

Goal constraints driving this list: the app must stay fast and light enough to run
on Vercel's free tier and Neon's free tier at a target of ~1M users, moving to
Vercel Pro only if genuinely forced.

The rule for everything below: **you cannot refactor safely toward "fast and
cheap" until you can measure fast and cheap, and until the test suite survives
files moving.** Right now neither is true.

---

## Where the codebase actually stands

Measured on the current `main`:

| Thing | Current state |
| --- | --- |
| Source size | 284 files, ~27,700 lines of TS/TSX |
| Routes | 43 route files under `src/app` |
| Routes pinned `force-dynamic` | **20 of 43**, including `/`, every movie/TV detail page, and every profile page |
| Components | 123 `.tsx`, **43 marked `'use client'`** |
| UI weight | Chakra UI 3 imported in **76 files**, plus Emotion, framer-motion (2), react-icons (18) |
| Tests | 17 files; **879 assertions are regexes run against source text** in 14 of them |
| Real behavior tests | 9 files use PGlite and exercise actual SQL — these are the good ones |
| Database | 18 tables, 39 indexes, 13 migrations |
| CI | **None.** No `.github/`, and `prepare: husky` is set but `.husky/` does not exist |
| Bundle measurement | **None.** No analyzer configured |
| Dead-code tooling | `knip` is installed as a dependency but has **no npm script** |

Three of these are refactor blockers and are the reason this checklist is ordered
the way it is:

1. **879 source-shape assertions.** Tests like `tests/tv-show-detail-ux.test.ts`
   read `src/app/tv/show/[id]/page.tsx` as a string and assert
   `assert.match(route, /getMovieDetailServer\(movieId\)/)`. Every one of those
   breaks the moment you move, rename, or restructure a file — and none of them
   would notice if the page rendered a blank screen. A refactor against this
   suite produces hundreds of red tests that tell you nothing about whether the
   app still works.
2. **20 `force-dynamic` routes.** Public movie and TV detail pages are ~static
   TMDB content, yet each request runs a serverless function and hits Neon. This
   is the single largest driver of both cost and latency at scale, and it is a
   decision to make *before* restructuring, not after.
3. **No CI.** `pnpm test lint type:check build` are manual. A multi-week refactor
   with no automated gate will drift.

---

## Phase 1 — Build the safety net (do not skip; nothing else is safe first)

### 1.1 Replace source-regex tests with behavior tests

This is the highest-value action on the list. Until it is done, the test suite
actively punishes refactoring.

Keep the PGlite tests (`auth-database`, `privacy-compliance`, and the DB halves
of the others) — they run real SQL and are exactly the kind of test that survives
a refactor. Replace the string-matching ones with end-to-end tests that assert on
rendered output. Playwright's Chromium is already available in this environment.

> **Prompt:**
> Audit `tests/` and classify every assertion as either (a) a behavior assertion
> that runs code, or (b) a source-shape assertion that regexes a file's text.
> Produce a table of the counts per file. Then, for the top 5 user journeys —
> anonymous home/explore browsing, movie detail, TV show detail with season and
> episode drill-down, auth (register → verify → login → reset), and library
> mutations (watchlist, watch status, episode progress, rating) — write
> Playwright end-to-end tests that assert on rendered DOM and database state,
> not on source text. Use the already-installed Chromium at
> `PLAYWRIGHT_BROWSERS_PATH`. Do not delete the old tests yet; add the new suite
> alongside as `tests/e2e/` with its own npm script.

> **Prompt (follow-up, only once the E2E suite passes):**
> Now delete the source-regex assertions that are fully covered by the new E2E
> tests. For any that encode a genuine architectural invariant rather than a UI
> detail — for example `tests/server-component-boundaries.test.ts` guarding the
> Chakra-component-as-prop rule, and the cache-safety checks — keep them, but
> rewrite them as AST-based lint rules or Biome rules so they survive file moves.
> List anything you had to drop coverage for.

### 1.2 Stand up CI

> **Prompt:**
> There is no `.github/` directory and no `.husky/` directory despite
> `prepare: husky` in package.json. Create a GitHub Actions workflow that runs
> on every push and PR: `pnpm install --frozen-lockfile`, `pnpm lint`,
> `pnpm type:check`, `pnpm test`, `pnpm build`. Cache the pnpm store and the
> Next.js build cache. Also set up the husky pre-commit hook that
> `prepare: husky` expects, running `pnpm lint` and `pnpm type:check` on staged
> files only. Keep the workflow under the free GitHub Actions minutes for a
> private repo — do not add a matrix across Node versions; pin to the Node 24
> version in `engines`.

### 1.3 Freeze the behavior contract

You need a written description of what the app *does*, independent of how it is
structured, so you can tell "I refactored this" from "I broke this."

> **Prompt:**
> Write `BEHAVIOR.md` documenting the observable behavior of every route in
> `src/app`: who can access it (anonymous / authenticated / admin), what data it
> loads and from where (TMDB, Neon, both), what it renders, what mutations it
> exposes, and its caching/revalidation behavior. Derive this from the code, not
> from `AGENTS.md`. Where the code and `AGENTS.md` disagree, flag the
> discrepancy explicitly rather than picking one. This document is the contract
> the refactor must preserve.

### 1.4 Tag a rollback point

> **Prompt:**
> Tag the current `main` as `pre-refactor-baseline` and push the tag. Confirm the
> tagged commit builds clean and deploys successfully to Vercel.

---

## Phase 2 — Measure the baseline (you have zero numbers today)

You cannot claim a refactor made the app lighter without a before-number. There
is currently no bundle analysis, no Web Vitals record, and no query timing.

### 2.1 Bundle and client-JS baseline

43 of 123 components are client components, and Chakra UI 3 + Emotion +
framer-motion + react-icons are all in the client graph. That is the weight
budget.

> **Prompt:**
> Add `@next/bundle-analyzer` behind an `ANALYZE=true` env flag and an
> `analyze` npm script. Run a production build and record in
> `docs/baseline/bundle.md`: the First Load JS for every route, the shared chunk
> size, and the top 20 modules by parsed size. Then answer specifically: how much
> of the client bundle is Chakra UI 3, how much is Emotion, how much is
> framer-motion, and how much is react-icons. For react-icons, check whether the
> 18 importing files are tree-shaking correctly or pulling whole icon packs.
> Do not change any code in this task — measure only.

### 2.2 Runtime and Core Web Vitals baseline

> **Prompt:**
> Record a performance baseline for the deployed production app. For `/`,
> `/explore`, `/movies`, a movie detail page, a TV show detail page, a season
> page, and an authenticated `/profile`, capture Lighthouse scores plus LCP,
> CLS, INP, and TTFB, on both a simulated mobile-4G profile and desktop. Save
> raw results and a summary table to `docs/baseline/web-vitals.md`. Also wire up
> `@vercel/speed-insights` or report `useReportWebVitals` to the existing Umami
> instance so field data accumulates during the refactor. Measure only — no
> optimization in this task.

### 2.3 Database baseline

39 indexes across 18 tables is a reasonable start, but no query plan has been
verified.

> **Prompt:**
> For every SQL statement in `src/lib/services/database/**` — `tracking.server.ts`
> alone has 26 — run `EXPLAIN (ANALYZE, BUFFERS)` against a Neon branch seeded
> with realistic volume: 100k profiles, ~50 library rows each, ~200 episode
> progress rows for active users. Record in `docs/baseline/queries.md`: the plan,
> whether an index is used or it falls back to a sequential scan, and the timing.
> Flag every query doing a seq scan on a table over 10k rows, every query without
> a supporting index for its WHERE/ORDER BY, and every code path that issues
> queries in a loop. Do not add indexes yet — produce the list first.

### 2.4 Cost model against the free tiers

This is the action that decides whether "1M users on the free tier" is a real
target or a fantasy, and it should happen before you design the new architecture
around it.

> **Prompt:**
> Look up the *current* published limits for the Vercel Hobby plan and the Neon
> free plan — do not rely on remembered numbers, fetch them. Then build a cost
> model in `docs/baseline/cost-model.md` for 1,000,000 registered users at
> plausible engagement (state your DAU assumption explicitly and model 1%, 5%,
> and 20% DAU). Compute against those limits: serverless function invocations
> per month, function GB-hours, bandwidth, Neon compute hours, Neon storage, and
> Neon data transfer. Use the fact that 20 of 43 routes are `force-dynamic` —
> meaning every single view of those pages is a function invocation plus DB
> queries — as the basis for the invocation estimate. Report bluntly at which
> user count each individual limit is breached, and which limit breaks first.

Be prepared for the honest answer here: **1M users on Vercel Hobby is very
unlikely to work as currently built**, and Hobby's terms also restrict commercial
use. The point of the model is not to prove it is possible — it is to find out
exactly how far you can get, and to identify which specific changes (static
rendering, edge caching, cutting DB reads per view) buy the most headroom before
you must pay. Design the refactor around that ranking.

---

## Phase 3 — Map what exists before you move it

### 3.1 Dead code and unused schema

`knip` is already a dependency with no script wired up. And `AGENTS.md` states
that `custom_lists` / `custom_list_items` from migration `0010` are no longer
read or written by the app — that is dead schema still occupying your Neon
storage budget.

> **Prompt:**
> Add a `knip` npm script and run it. Produce `docs/refactor/dead-code.md`
> listing unused files, unused exports, unused dependencies, and unused types.
> Separately, cross-check every table and column in `database/migrations/` against
> actual query usage in `src/lib/services/database/**` and report any that are
> never read or written — `AGENTS.md` already flags `custom_lists` and
> `custom_list_items` as one such case; confirm it and find the rest. Do not
> delete anything yet; produce the inventory and mark each entry
> safe-to-delete / needs-review / keep.

### 3.2 Duplication and convergence map

This is the actual "too many feature additions" problem you described.

> **Prompt:**
> Find structural duplication across the codebase. Specifically compare:
> the movie and TV pipelines under `src/lib/services/tmdb/movie/**` vs
> `src/lib/services/tmdb/tv/**`; the movie vs TV page trees under
> `src/lib/pages`; the parallel `*-queries.ts` and `*.server.ts` pairs in
> `src/lib/services/database`; and the `src/lib/features/*` modules
> (`library`, `tracking`, `watchlist`, `reviews` overlap heavily by name).
> For each cluster, report: what is genuinely duplicated, what only looks
> duplicated but differs in meaningful ways, and what a unified abstraction
> would cost in indirection. Write it to `docs/refactor/duplication.md` and rank
> by lines saved versus risk. Recommend explicitly where NOT to unify.

### 3.3 Dependency graph and boundary violations

> **Prompt:**
> Generate a module dependency graph for `src/` and check it against the folder
> boundaries declared in `AGENTS.md` under "Folder Boundaries". Report every
> violation: `src/app` route files containing UI logic that belongs in
> `src/lib/pages`, cross-imports between `src/lib/features/*` siblings, anything
> importing a `*.server.ts` from a client component, and any circular
> dependencies. Save to `docs/refactor/boundaries.md`. Also identify the files
> most depended upon — those are the ones where a refactor mistake is most
> expensive.

### 3.4 Client/server boundary audit

43 client components is where your bundle weight comes from, and Chakra 3 ships
client components, so the boundary is easy to over-extend by accident.

> **Prompt:**
> List all 43 files marked `'use client'` in `src/`. For each, state the specific
> reason it needs to be a client component (event handler, hook, browser API,
> Chakra interactive component) and whether that reason applies to the whole file
> or only a small part of it. Flag every one where the client boundary could be
> pushed to a smaller leaf component, keeping the parent on the server. Rank by
> estimated client-JS saved. Report to `docs/refactor/client-boundaries.md` — do
> not make changes yet.

---

## Phase 4 — Decide the destination before you start moving

### 4.1 Resolve the rendering strategy

This decision determines most of the refactor's shape and nearly all of its cost
impact, so make it explicitly and in writing.

> **Prompt:**
> Using `docs/baseline/cost-model.md` and `BEHAVIOR.md`, write
> `docs/refactor/rendering-strategy.md` deciding, for each of the 43 routes,
> the target rendering mode: static, ISR with a stated revalidate window,
> dynamic with cached data, or genuinely per-request dynamic. Justify each
> against what the page actually shows. Pay particular attention to the 20
> currently pinned `force-dynamic` — for public TMDB-backed detail pages, show
> what it would take to make them cacheable, including how to move the
> per-user overlay (watch status, rating, watchlist state) out of the server
> render and into a small client-side fetch so the page shell can be shared
> across all users. Quantify the invocation and Neon-query reduction for each
> change.

### 4.2 Settle the UI-library question

Chakra 3 + Emotion is a runtime-CSS-in-JS stack in 76 files. It is the largest
single lever on bundle weight, and also the most expensive thing to change. This
needs an explicit decision, not a drift.

> **Prompt:**
> Using the bundle baseline, assess whether Chakra UI 3 + Emotion should stay.
> Quantify: current client-JS attributable to them, the runtime cost of
> Emotion's style serialization on a Chakra-heavy page, and the realistic saving
> from moving to a zero-runtime approach (Tailwind, or CSS Modules with the
> existing theme tokens). Weigh that against the cost of touching 76 files.
> Give a clear recommendation with a number attached, and if the recommendation
> is to migrate, propose an incremental path that can run alongside the rest of
> the refactor rather than a big-bang rewrite. Write it to
> `docs/refactor/ui-library-decision.md`.

### 4.3 Write the refactor plan itself

> **Prompt:**
> Using every document in `docs/baseline/` and `docs/refactor/`, write
> `docs/refactor/PLAN.md`: an ordered sequence of independently shippable,
> independently revertible steps. Each step must state its blast radius, which
> E2E tests cover it, its expected effect on the bundle/invocation/query
> baselines, and its rollback. Order them so the highest cost-and-latency wins
> (rendering strategy, client-boundary reduction) land before the purely
> cosmetic reorganization. No step may touch more than one of these at a time:
> file structure, rendering mode, UI library, database schema. Explicitly list
> what is out of scope.

### 4.4 Update the agent contract

`AGENTS.md` is 31KB of accumulated rules and includes "Avoid broad refactors" —
which will fight you during the refactor itself.

> **Prompt:**
> Revise `AGENTS.md` for the refactor period. Mark which rules are permanent
> invariants (server-only DB access, no TMDB key on the client, storage-free
> avatars, the Chakra-component-as-prop rule, migration ordering) versus which
> are descriptions of the current structure that the refactor is allowed to
> change. Remove the blanket "avoid broad refactors" rule for the duration and
> replace it with a pointer to `docs/refactor/PLAN.md`. Flag any rule that has
> already drifted from what the code actually does.

---

## Suggested order

Phase 1 is genuinely blocking — the safety net has to exist first, and the test
rewrite is the biggest single piece of work on this list. Phase 2 and Phase 3
are largely independent of each other and can interleave. Phase 4 depends on
both. Do not start moving files until `docs/refactor/PLAN.md` exists.

A reasonable sequencing:

1. 1.4 (tag), then 1.2 (CI) — both are small and immediately useful
2. 1.1 (E2E suite) and 1.3 (behavior doc) — the long pole
3. 2.1–2.4 in parallel with 3.1–3.4
4. 4.1–4.4
5. Begin the refactor

## The one thing to decide early

Run **2.4 (the cost model)** sooner rather than later, even out of order. If it
shows that the free-tier target breaks at 50k users rather than 1M, that changes
what the refactor is *for* — and it is much better to know that before you have
designed around the wrong constraint.
