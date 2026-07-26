# UI library decision: Chakra UI 3 + Emotion

## What's measured, precisely

From `docs/baseline/bundle.md`, against the real production build:

- Every route ships **519.7–609.1 KB raw / roughly 143–173 KB gzip** of
  client JS, regardless of what the route actually does — `/privacy`, pure
  static legal text with zero interactivity, still ships **143.3 KB gzip**.
- **At least 44% of all client JS shipped across the app (750 KB of 1.7 MB
  raw across all 244 chunks) references Chakra UI class-name strings
  directly.** This is a floor, not a ceiling — it only counts chunks where a
  literal `chakra-*` class string survives minification; it doesn't count
  chunks that use Chakra's non-DOM-emitting internals without that string
  showing up.
- **76 files** import `@chakra-ui/react` directly. Emotion is never
  imported directly by app code (0 files) — it's pulled in transitively as
  Chakra's own styling engine, which matters because it means removing
  Chakra removes Emotion automatically; there's no separate Emotion
  migration to do.
- `docs/refactor/client-boundaries.md` found the app's actual *interactive*
  surface is a well-scoped, moderate set of components (forms,
  optimistic-update widgets, a handful of leaf components) — the 76-file
  count is inflated by every file that imports a purely presentational
  Chakra primitive (`Box`, `Flex`, `Text`, `Grid`) for layout, not by 76
  files' worth of genuinely complex interactive logic.

## What's a reasoned estimate, not a measurement

**I did not build a with-Chakra-vs-without-Chakra comparison** — that would
require actually converting a page and measuring the real delta, which is
exactly what the recommendation below proposes doing before committing to
anything larger. What can be said with the evidence in hand: React and
Next.js's own App Router hydration runtime has a real, unavoidable cost
regardless of UI library — some portion of that ~143 KB floor is that,
not Chakra. Given Chakra/Emotion is confirmed as *at least* 44% of total
shipped JS and is a runtime CSS-in-JS engine (meaning it also costs CPU
time serializing styles on every render, not just download bytes — relevant
to `docs/baseline/cost-model.md`'s Active CPU time constraint, separate
from the bandwidth one), a plausible range for the floor after removing it
is **meaningfully lower, very possibly by half or more** — but stating an
exact number here would be manufacturing false precision. The honest
answer is "significant, needs a real spike to quantify," and that's what's
recommended.

## Recommendation: migrate, but spike first — don't commit to a full rewrite blind

Given the free-tier cost/performance target is an explicit product
requirement (not a nice-to-have), and the measured floor is real and paid
by every single route regardless of content, staying on a runtime CSS-in-JS
library works directly against the stated goal. But a 76-file migration is
real cost, and committing to it without a confirmed number first would be
exactly the kind of expensive rewrite this whole pre-refactor process
exists to avoid making blindly.

**Step 1 — the spike (do this first, before deciding anything else):**
Convert `/privacy` and `/terms` to plain CSS (Tailwind or CSS Modules —
either works for this spike) instead of Chakra. Both are already flagged
in `docs/refactor/rendering-strategy.md` as moving to fully static
rendering, both are pure presentational content with zero interactive
components, and both are low-traffic enough that a mistake here costs
nothing. Rebuild, re-run the exact measurement `docs/baseline/bundle.md`
used (parse the route's `client-reference-manifest.js`, sum and gzip the
referenced chunks), and get a real, specific number for what removing
Chakra from a page actually saves in this app, on this Next.js version,
with this build setup. This turns the estimate above into a fact within
an afternoon of work, for near-zero risk.

**Step 2 — decide the scope based on Step 1's real number.** If the spike
shows a large gzip reduction (consistent with the "at least 44%" floor
already measured), proceed to Step 3. If it shows a small one, stop here —
the migration cost wouldn't be justified, and the effort is better spent
entirely on `docs/refactor/rendering-strategy.md`'s invocation-reduction
work instead.

**Step 3 — incremental migration, not a big-bang rewrite**, ordered by
leverage:

1. **Shared leaf components first** — `PageShell`, `Section`, `PosterCard`,
   `PosterImage` (per `docs/refactor/client-boundaries.md`, these are
   already small, well-scoped, and used by nearly every route via
   `lib/types/index.ts`-adjacent high-fan-in files). Converting these
   compounds savings across every route that imports them, rather than
   converting one page at a time and only saving that page's slice.
2. **Static/legal pages** — already converted in the spike; nothing more to
   do here.
3. **The five zero-client-signal files** from
   `docs/refactor/client-boundaries.md` (`ProfileStatRail.tsx`, `404.tsx`,
   `admin/panels.tsx`, `movies/index.tsx`, `tv-shows/index.tsx`) — already
   flagged to drop `'use client'`; converting their Chakra usage at the
   same time means they end up both server-rendered *and* off the runtime
   styling engine.
4. **Forms and optimistic-update widgets last** — these carry the real
   interactive logic (`useActionState`, `useTransition`, rollback-on-failure
   state) and are the highest-risk group to convert, since a mistake here
   changes actual behavior, not just styling. Migrate these once the
   pattern is well-established from steps 1–3, and lean on the E2E suite
   (`tests/e2e/`) — particularly `library-mutations.spec.ts`, once run
   against a real database — to catch regressions.
5. Coexistence during the migration is fine and expected: Tailwind (or CSS
   Modules) and Chakra can run side by side per-file for as long as the
   migration takes; there's no forced cutover point.

**Tailwind vs. CSS Modules**, if it comes to choosing: leaning toward
Tailwind given it pairs naturally with headless/accessible primitive
libraries (Radix-based, e.g. shadcn/ui patterns) for the interactive
components in step 4 — those need the same accessible-dialog/dropdown/
combobox behavior Chakra currently provides, and reimplementing that from
raw CSS Modules would be real, avoidable work. This is a reasoned
preference based on general ecosystem fit, not a measurement specific to
this app — worth confirming once Step 1's spike is done and Step 3 is
actually being planned in detail, not locked in now.

## What NOT to do

Don't start a full Chakra-to-Tailwind rewrite as the refactor's first move.
`docs/refactor/rendering-strategy.md`'s invocation-count fixes are cheaper,
lower-risk, and address the sharper of the two Vercel constraints
(`docs/baseline/cost-model.md`: invocations break before Active CPU time
does, at the traffic levels modeled). Do the rendering-strategy work and
the UI-library spike in parallel if there's bandwidth for both, but don't
let "we should probably also migrate off Chakra eventually" turn into the
reason the higher-priority, already-fully-scoped rendering changes get
delayed.
