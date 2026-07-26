# Client/server component boundary audit

42 files are marked `'use client'` in `src/`. Each was checked for what
specifically requires the client boundary (a hook, an event handler, a
browser-only API) and, where nothing did, flagged as a candidate to become a
Server Component instead — which directly reduces the client JS every page
that imports it has to ship, the exact weight the bundle baseline
(`docs/baseline/bundle.md`) measured at a ~143 KB gzip floor on every route.

## The finding: 5 files need no client boundary at all

Checked for every hook (`useState`, `useEffect`, `useTransition`,
`useActionState`, `useRouter`, `useSearchParams`, `usePathname`,
`useCallback`, `useMemo`, `useContext`, `useReducedMotion`, any custom
`use*` hook) and every DOM event handler (`onClick`, `onChange`,
`onSubmit`) across each file's **full** content, not just its top-level
render. Five files have **zero** matches for any of it:

| File | Lines | What it actually does |
| --- | --- | --- |
| `lib/components/profile/ProfileStatRail.tsx` | 81 | Renders a grid of stat cards (icon + number + label) from props. No state, no handlers. |
| `lib/pages/404.tsx` | 43 | Static "Page not Found" content with one `<Link>` back home. |
| `lib/pages/admin/panels.tsx` | 147 | Shared bordered-card "shell" wrapper components for the admin dashboard — pure layout, no behavior of its own. |
| `lib/pages/movies/index.tsx` | 101 | Groups and renders the personal movie library into "planned"/"finished" sections. Renders `PosterCard` (itself already a client component) and a `Button`/`Link`, but needs no client-only behavior at its own level. |
| `lib/pages/tv-shows/index.tsx` | 126 | Same shape as `movies/index.tsx`, for TV. |

None of these need to be Client Components. A Server Component can import
and render an already-client-marked child (`PosterCard`, Chakra's `Button`)
directly — the restriction is on *passing functions as props*, not on
*rendering a client import*, and none of these five do the former. Dropping
`'use client'` from all five is a safe, mechanical change: their output is
fully deterministic from props, so nothing about their behavior changes,
only where the render happens.

This is a pure, uncomplicated win worth doing early and separately from
anything else in the refactor — there's no design decision attached to it,
just five directives to delete and a build to confirm nothing broke.

## The rest — legitimately client, grouped by why

**Forms and admin mutations (useActionState)** — `admin/curated-lists.tsx`,
`admin/dashboard.tsx`, `admin/lists.tsx`, `admin/login-form.tsx`,
`admin/moderation.tsx`, `admin/privacy.tsx`, `auth/forms.tsx`,
`contact/contact-form.tsx`, `profile/profile-form.tsx`,
`profile/privacy-form.tsx`. All genuinely need the client boundary for
`useActionState`/form state. `auth/forms.tsx` (498 lines) and
`profile/profile-form.tsx` (475 lines) are the two largest client files
after the episode tracker below — both are legitimately large multi-field
forms with client-side validation feedback, not a boundary problem.

**Optimistic-update widgets (useState + useTransition + router hooks)** —
`library/media-detail-actions.tsx`, `library/media-library-provider.tsx`,
`library/media-quick-actions.tsx`, `reviews/rating-input.tsx`,
`reviews/star-rating.tsx`, `social/follow-button.tsx`,
`tracking/media-status-control.tsx`, `watchlist/watchlist-button.tsx`,
`tv/episode/detail/components/episode-progress-panel.tsx`,
`tv/season/detail/components/season-episode-list.tsx`. This is the app's
core interaction pattern — click, update local state immediately, fire the
server action, roll back on failure — and every file in this group needs
the client boundary for exactly that reason. Correctly scoped already:
these are mostly small, focused leaf components (`follow-button.tsx` is 82
lines, `star-rating.tsx` 98), not page-level wrappers.

**Navigation/active-link (usePathname)** — `layout/Header.tsx`,
`layout/index.tsx`. Needed to highlight the current nav item; there's no
smaller leaf to push this into without restructuring how the header
composes, and the cost (two files, `usePathname` only) is low.

**Data-fetching hooks (custom `use*` / SWR)** — `movie/images/index.tsx`
(`useMovieImages`), `search/use-search-results.ts`,
`pages/search/results/index.tsx`, `pages/media/media-search-bar.tsx`.
Legitimately client — these fetch through `/api/tmdb` client-side per
AGENTS.md's rule that client components must use the SWR hooks rather than
touching `TMDB_API_KEY` directly.

**Small, already-minimal leaves** — `movie/detail/components/back-button.tsx`
(28 lines: one `onClick` + `useRouter`), `components/shared/PosterImage.tsx`
(68 lines: `useState` for an image-load-error fallback),
`auth/client-actions.tsx` (68 lines). These are the model for what a client
leaf should look like — small, single-purpose, nothing to shrink further.

**Third-party hook requirement** — `pages/home/Hero.tsx` needs
`useReducedMotion` from `framer-motion` (a genuine hook, invisible to a
grep for React's built-ins — worth noting since it's the one file in the
"zero signal at first glance" list that turned out to have a real reason
once framer-motion's own hooks were included in the check).

**Root providers** — `components/ui/provider.tsx`, `components/ui/
color-mode.tsx`, `app/error.tsx`. Structurally required (Chakra's provider
tree, Next's error-boundary contract). `color-mode.tsx`'s exports are
mostly dead per `docs/refactor/dead-code.md` (the app forces
`forcedTheme="dark"`), which is a separate, larger finding than the client
boundary itself — the file still needs `'use client'` for
`ColorModeProvider`, but most of what it exports could be deleted outright.

## The large-file case study: episode-tracker.tsx is NOT a boundary problem

At 783 lines, `lib/pages/tv/detail/components/episode-tracker.tsx` is by
far the largest client file in the app — nearly double the next-largest
(`auth/forms.tsx` at 498). It's tempting to assume a file this size is
over-scoped as a client boundary, but checking its structure shows it
isn't: state (`watchedBySeason`, `episodesBySeason`, `expandedSeason`,
`loadingSeason`, `pendingKeys`) lives in the top-level `EpisodeTracker` and
drives every sub-component it defines (`ProgressBar`, `SeenButton`,
`EpisodeCard`, `EpisodeRow`, `SeasonEpisodeList`, `SeasonDropdown`) — a
season carousel with expand/collapse, per-episode and per-season batch
watched-toggling, and optimistic rollback on failure, exactly as
`BEHAVIOR.md` describes it. None of that can move to the server without
losing the live-update behavior that's the entire point of the component.
This is the same shape of finding as `docs/refactor/duplication.md`'s
`tv-library-state.ts` comparison: large and client-only because the feature
genuinely is that stateful, not because the boundary was drawn carelessly.
Worth stating explicitly so this file isn't mistakenly targeted for a
boundary fix that would either not reduce shipped JS (state has to live
somewhere) or would break the optimistic-update UX to save bytes that
aren't actually removable.

## Priority for the refactor

1. **Do first, low risk**: drop `'use client'` from the 5 zero-signal
   files above. Mechanical, safe, immediately reduces client JS on the
   Home/library-index/404/admin pages.
2. **Do alongside the dead-code cleanup**: deleting `color-mode.tsx`'s dead
   exports (per `docs/refactor/dead-code.md`) shrinks what that file's
   client boundary carries, even though the boundary itself stays.
3. **Leave alone**: everything else. The forms, optimistic-update widgets,
   and the episode tracker are all legitimately scoped to their actual
   interactive surface — this app's client-boundary problem isn't "too
   many components wrongly marked client," it's the ~143 KB gzip shared
   floor documented in `docs/baseline/bundle.md`, which is a UI-library
   question (Chakra/Emotion), not a component-boundary one.
