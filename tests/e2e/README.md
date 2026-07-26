# E2E test suite

Playwright tests replacing the source-regex assertions documented in
`docs/refactor/test-classification.md`. These assert on rendered behavior —
what a browser actually sees — instead of regexing route/component source
text, so they survive the refactor moving files around.

## Running

```bash
pnpm test:e2e
```

Starts two servers automatically (see `playwright.config.ts`):
a mock TMDB server (`tests/e2e/mocks/tmdb-mock-server.mjs`, no real
`TMDB_API_KEY` needed) and the Next.js dev server pointed at it.

## What runs without any setup

`public-discovery.spec.ts` and `media-detail.spec.ts` cover the fully public,
session-independent journeys — anonymous Home browsing, public movie/TV
discovery lists, and movie/TV/season/episode detail pages. Per BEHAVIOR.md,
progress/favorite reads on detail/season/episode pages short-circuit before
touching the database when there is no session, so none of this needs a real
Neon connection. `auth.spec.ts`'s three non-gated tests (registration
validation, login-with-unknown-identifier, forgot-password confirmation) also
run without a real database, because `registerWithCredentials` validates and
returns field errors before ever calling the database.

## What needs a real database (`E2E_REAL_DATABASE=1`)

The full auth round-trip in `auth.spec.ts` and all of
`library-mutations.spec.ts` are skipped unless `E2E_REAL_DATABASE=1` is set,
because:

- They need a real Neon connection (`DATABASE_URL` / `DATABASE_URL_UNPOOLED`)
  with the schema in `database/migrations` applied. The
  `@neondatabase/serverless` `neon()` client speaks Neon's HTTP protocol
  specifically — it cannot be pointed at an arbitrary local Postgres (there is
  no drop-in local substitute the way the mock TMDB server substitutes for
  TMDB; Neon's own "Neon Local" Docker proxy is the closest thing, but that's
  extra infrastructure this suite deliberately doesn't take on).
- `library-mutations.spec.ts` seeds an already-verified test account directly
  into the database (same pattern as `tests/auth-database.test.ts`'s PGlite
  scenarios) rather than going through registration, so it needs
  `hashPasswordCore` and a writable `DATABASE_URL_UNPOOLED`.

To run these for real: point `DATABASE_URL`/`DATABASE_URL_UNPOOLED` at a
disposable Neon branch with migrations applied, then:

```bash
E2E_REAL_DATABASE=1 DATABASE_URL=... DATABASE_URL_UNPOOLED=... pnpm test:e2e
```

## What is *not* automatable, and why

The full register → verify-by-email → login round trip in `auth.spec.ts`
throws deliberately once it reaches the "check your email" step. The
verification token is only ever available in the email Resend sends — the
database stores nothing but a one-way digest of it, by design (see
`AGENTS.md`, "Keep email/password authentication on the established
credentials account model"). The Resend Node SDK has no configurable base URL
to redirect to a local capture server the way `TMDB_API_URL` redirects to the
mock TMDB server here, so completing this test needs either a real test
mailbox this step can poll or a Resend webhook capture endpoint — genuine
email infrastructure, not something to fake with a shortcut that would
weaken a security-sensitive flow. The token-consumption logic itself is
already correctly covered without any of this, at the database layer, by
`tests/auth-database.test.ts` and `tests/auth-lifecycle.test.mjs`.

## A finding surfaced by writing this suite

Movie/TV detail, season, and episode pages occasionally render slower than
`public-discovery.spec.ts`'s pages and need a longer visibility timeout
(`HYDRATION_TIMEOUT` in `media-detail.spec.ts`). In this sandbox, that's
because `next/font`'s fetch to Google Fonts fails (no network egress to
`fonts.googleapis.com`), which trips a server-render error and falls back to
slower client-side rendering — the browser console shows "Switched to client
rendering because the server rendering errored." A real deployment with
normal internet access shouldn't hit this specific trigger, but it's worth
independently checking whether `next/font` failures more generally cause a
full SSR-to-CSR fallback rather than the graceful same-request fallback font
substitution Next.js documents — that would be worth confirming directly
against a production build rather than assumed from this sandbox's behavior.
