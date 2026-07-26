# Test assertion classification

Every assertion in `tests/` classified as either a **behavior assertion**
(runs real code — a function call, a PGlite-backed query, a rendered value —
and checks the result) or a **source-shape assertion** (reads an app file as a
string via `readFile`/`readFileSync` and regexes the source text itself).

This matters because only the first kind survives a refactor: a source-shape
assertion breaks the moment a file is renamed or restructured, whether or not
the app still behaves correctly, while a behavior assertion tracks what the
app actually does regardless of where the code lives.

A naive count of `assert.match`/`assert.doesNotMatch` calls overstates
source-shape assertions, because some tests use a regex to check a
**runtime-computed value** (a bcrypt hash, a digest, a normalized string) —
that is a behavior assertion that happens to use a regex matcher, not a
source-shape assertion. The counts below correct for that distinction.

## Per-file counts

| File | Total assertions | Source-shape | Behavior | Uses PGlite | Category |
| --- | --- | --- | --- | --- | --- |
| `tv-show-detail-ux.test.ts` | 114 | 113 | 1 | no | source-shape |
| `movie-detail-ux.test.ts` | 98 | 97 | 1 | no | source-shape |
| `auth-lifecycle.test.mjs` | 56 | 56 | 0 | no | source-shape |
| `home-ux.test.mjs` | 87 | 84 | 3 | no | source-shape |
| `tv-season-episode-ux.test.ts` | 116 | 94 + 5* | 17 | yes | hybrid |
| `legal-contact-ux.test.ts` | 129 | 101 | 28 | yes | hybrid |
| `tv-library-ux.test.ts` | 74 | 46 | 28 | yes | hybrid |
| `profile-experience.test.ts` | 88 | 61 | 27 | yes | hybrid |
| `admin-dashboard.test.ts` | 147 | 65 | 82 | yes | hybrid |
| `movie-library-ux.test.ts` | 63 | 44 | 19 | yes | hybrid |
| `social-pages.test.ts` | 53 | 32 | 21 | yes | hybrid |
| `search-ux.test.ts` | 46 | 37 | 9 | no | source-shape-heavy |
| `cache-safety.test.ts` | 41 | 36 | 5 | no | **config-invariant** (see below) |
| `server-component-boundaries.test.ts` | 7 | 6 | 1 | no | **config-invariant** (see below) |
| `auth-security.test.ts` | 41 | 0 | 41 | no | **pure behavior** |
| `auth-database.test.ts` | 30 | 0 | 30 | yes | **pure behavior** |
| `privacy-compliance.test.ts` | 16 | 0 | 16 | yes | **pure behavior** |
| **Total** | **1,206** | **~874** | **~332** | 9 files | |

\* `tv-season-episode-ux.test.ts` includes a few `assertInOrder` helper calls
against source text, folded into the source-shape count.

## What this actually means (it's not a clean 9-good/8-bad split)

The naive framing — "9 files use PGlite and are good, the rest are bad" — is
wrong. **Even the PGlite-backed files are majority source-shape assertions.**
`legal-contact-ux.test.ts` is 78% source-regex despite exercising a real
database. `tv-season-episode-ux.test.ts` is 81%. `admin-dashboard.test.ts` is
the best of the hybrid group at "only" 44% source-regex. The refactor-blocking
problem is spread through nearly every file, not confined to a few.

This means the fix in most files is **surgery, not replacement**: keep the
PGlite-backed assertions in place (they're the valuable, refactor-safe part)
and cut the source-regex assertions in the same file, replacing what they were
trying to guarantee with an E2E assertion or, where the thing being checked
is genuinely a static property of the code rather than a runtime behavior,
a lint rule instead.

## Three different categories, three different fixes

**1. Pure UI/routing source-shape assertions → replace with E2E.**
`tv-show-detail-ux`, `movie-detail-ux`, `home-ux`, `auth-lifecycle`,
`search-ux`, and the source-shape portions of the six hybrid files. These
assert things like "the route imports `getMovieCreditsServer` and catches its
failure" or "the season page renders watched/total and a percentage" by
regexing the page source. The right replacement is a Playwright test that
actually loads the route and asserts on rendered DOM/behavior — this is what
Phase 1.1's E2E suite (task below) targets directly.

**2. Config/architecture-invariant assertions → convert to lint rules, not E2E.**
`cache-safety.test.ts` and `server-component-boundaries.test.ts` are
different in kind from the rest. They aren't really testing product behavior;
they're testing **static properties of the code** that would be
impractical or flaky to verify at the E2E layer:
  - `cache-safety.test.ts` asserts that specific files declare
    `export const dynamic = 'force-dynamic'`, reference
    `TMDB_REVALIDATE_SECONDS`, never use `cache: 'no-store'` on high-cardinality
    reads, and that no file calls `revalidatePath` (which would defeat the
    ISR/ tag-based invalidation strategy). You cannot reliably observe "was
    this response served from the Next Data Cache" from an E2E click-through
    without adding response-header instrumentation everywhere, and even then
    it's testing configuration, not user-facing behavior.
  - `server-component-boundaries.test.ts` asserts that no Server Component
    hands a function/component as a prop to a Chakra client component (`as=`,
    `icon=`, `component=`), which is a React serialization rule, not a
    behavior a user could exercise from the outside — the failure mode is the
    whole route crashing to the generic error page, which an E2E smoke test
    would technically catch, but only long after the fact and without
    pinpointing the cause the way this test's regex on the offending JSX does.

  These two files should be **kept**, but reimplemented as Biome lint rules
  (or a small custom AST check run in CI, since Biome's plugin story is
  limited) rather than `node:test` files that regex source text. That
  preserves the guarantee without it being a "test that breaks when files
  move" — a lint rule keyed on AST shape doesn't care what directory a file
  lives in.

**3. Already refactor-safe — leave alone.**
`auth-security.test.ts`, `auth-database.test.ts`, and
`privacy-compliance.test.ts` have zero source-shape assertions. They import
real functions and call them (`auth-security`) or spin up PGlite and run real
migrations/queries against it (`auth-database`, `privacy-compliance`). These
are the model to replicate — they will not need to change at all when files
move, because they don't know or care where the code they're calling lives on
disk.

## Recommended sequencing (feeds into task 6, the E2E suite)

1. Write the Playwright E2E suite (task 6) covering the journeys the
   source-shape assertions in category 1 currently (badly) proxy for.
2. Once an E2E assertion demonstrably covers what a source-shape assertion in
   `tv-show-detail-ux`, `movie-detail-ux`, `home-ux`, `auth-lifecycle`,
   `search-ux`, or a hybrid file was checking, delete that specific
   assertion — not necessarily the whole file, since several hybrid files
   have real PGlite tests worth keeping in place.
3. Convert `cache-safety.test.ts` and `server-component-boundaries.test.ts`
   into lint rules or a dedicated AST-check script, run from CI alongside
   `pnpm lint`, not from `pnpm test`.
4. Leave `auth-security.test.ts`, `auth-database.test.ts`, and
   `privacy-compliance.test.ts` untouched.
