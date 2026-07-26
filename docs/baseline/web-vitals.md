# Web Vitals / runtime baseline

## Methodology, and why these numbers need re-verification against a real deployment

This sandbox has no real internet access to TMDB, Neon, or Google Fonts, so
a fully faithful production measurement isn't possible here. What follows is
the most honest approximation available: a production build (`next build`)
served locally with `next start`, pointed at the mock TMDB server from
`tests/e2e/mocks/`, measured with a real Chromium instance under CDP network
throttling (~1.6 Mbps down / 750 Kbps up, 150ms latency — roughly Lighthouse's
mobile "Slow 4G" profile) and 4× CPU throttling, using the browser's own
`PerformanceObserver` APIs for LCP and CLS and the Navigation Timing API for
TTFB — the same underlying data Lighthouse itself reads, just captured
directly rather than through the Lighthouse CLI (which OOM'd in this sandbox
the same way the webpack bundle-analyzer build did — see
`docs/baseline/bundle.md`).

**Three things make these numbers non-representative of real production,
and re-measuring against an actual Vercel deployment with real Neon and
TMDB access is necessary before trusting them for a real decision:**

1. **No database.** `DATABASE_URL` is a non-existent local address, so every
   DB-backed read (curated lists, discovery-list settings) fails and falls
   back to defaults immediately (per the `.catch()` fallback behavior
   documented in `BEHAVIOR.md`) rather than taking real Neon round-trip time.
   Real TTFB against a cold/idle Neon compute (relevant given
   `docs/baseline/cost-model.md`'s finding about autosuspend) would be
   meaningfully worse than what's measured here.
2. **TMDB images are unreachable.** The app hotlinks posters/backdrops
   directly to `image.tmdb.org` (confirmed in `docs/baseline/cost-model.md` —
   no `next/image`, no configured remote patterns), and this sandbox can't
   reach that host at all. Image requests appear to hang until they time out
   rather than resolving quickly, which is the most likely explanation for
   the TV show/season detail outliers below — a real deployment with actual
   image access should look substantially different, likely better, though
   still worth confirming.
3. **No Google Fonts access.** `next/font`'s fetch to `fonts.googleapis.com`
   fails in this sandbox, which separately triggers the SSR-to-client-render
   fallback documented in `tests/e2e/README.md`. That specific failure mode
   shouldn't occur on a real deployment with normal internet access, but
   it's a second reason these numbers reflect this sandbox's constraints
   more than the app's real critical path.

Treat this as validating that the *harness* works and captures a plausible
shape of the problem (LCP variance between routes, CLS on media-heavy pages)
rather than as production-accurate numbers. Re-run the same measurement
script structure against a real deployed URL — or better, wire up
`@vercel/speed-insights` for real field data, as `PRE_REFACTOR.md`'s original
Phase 2.2 suggested — before using absolute numbers to prioritize work.

## Results

Each route measured cold (first visit) and warm (Data Cache primed within
the same server process) — the difference is small here specifically
*because* there's no real database or TMDB network latency for a cache to
meaningfully save.

| Route | Run | TTFB | LCP | CLS | DOMContentLoaded | Load |
| --- | --- | --- | --- | --- | --- | --- |
| Home (`/`) | cold | 168 ms | 724 ms | 0.035 | 799 ms | 2210 ms |
| Home (`/`) | warm | 112 ms | 948 ms | 0.035 | 546 ms | 2272 ms |
| Movies popular (public) | cold | 111 ms | 1412 ms | **0.331** | 910 ms | 2289 ms |
| Movies popular (public) | warm | 268 ms | 1296 ms | **0.331** | 585 ms | 2265 ms |
| Movie detail | cold | 96 ms | 700 ms | 0.116 | 454 ms | 2123 ms |
| Movie detail | warm | 105 ms | 672 ms | 0.116 | 414 ms | 2187 ms |
| TV show detail | cold | 87 ms | **3432 ms** | 0.177 | 449 ms | 2166 ms |
| TV show detail | warm | 107 ms | **3424 ms** | 0.177 | 419 ms | 2158 ms |
| TV season detail | cold | 157 ms | **3552 ms** | **0.257** | 419 ms | 2131 ms |
| TV season detail | warm | 122 ms | **3528 ms** | **0.257** | 393 ms | 2112 ms |
| Privacy (static) | cold | 99 ms | 644 ms | 0.008 | 401 ms | 2027 ms |
| Privacy (static) | warm | 122 ms | 568 ms | 0.008 | 396 ms | 2045 ms |

(Google's Core Web Vitals thresholds for reference: LCP good <2500ms/poor
>4000ms; CLS good <0.1/poor >0.25.)

## Findings

**TTFB is fast and consistent (87–268 ms) across every route**, which
mostly reflects that there's no real database or upstream API in this
measurement, not a real result about the app's server-side performance —
see the caveats above. Not a finding to act on; a real deployment number is
needed here instead.

**CLS is a real, actionable finding.** `Movies popular` measures **0.331 —
in Google's "poor" range** — and TV season detail (0.257) sits right at the
poor threshold. Movie detail (0.116) and TV show detail (0.177) are in the
"needs improvement" band. Only Home (0.035) and the static Privacy page
(0.008) are solidly good. This is layout shift from content loading in
after the initial paint — plausibly poster images and TMDB-sourced content
(ratings, genre badges, cast) resizing their containers as data arrives,
which is a real thing to check with **reserved aspect-ratio boxes or
skeleton states matched to final content size**, independent of the image
network issue above (CLS is about layout stability, not image load speed
per se, though a slow/failing image can make the shift-when-it-finally-
loads problem worse). Worth checking directly in a browser once TMDB
images actually load, rather than assuming this number is purely a sandbox
artifact.

**LCP on TV show/season detail (~3.4–3.6s) is the standout outlier** versus
movie detail (~700ms) for pages that are otherwise structurally similar.
Per the caveats above, the leading hypothesis is that TMDB image requests
hang until they time out in this network-blocked sandbox, and TV
show/season pages likely reference more images (season poster plus a
still image per episode row) than a single movie detail page — meaning
more images competing for the same blocked network path, and a bigger
chance one of them is the LCP candidate. This needs re-verification with
real TMDB image access before treating the ~3.4s number as real, but the
*relative* gap between movie and TV detail pages is worth checking for a
real cause even after that — if TV pages genuinely load more/larger
above-the-fold images than movie pages do, that's a legitimate optimization
target regardless of network conditions.

## What to do with this before the refactor

1. Wire up `@vercel/speed-insights` (or equivalent field-data collection)
   immediately on the current production deployment, per `PRE_REFACTOR.md`'s
   original Phase 2.2 — field data from real users on real networks is what
   should actually drive prioritization, not this sandbox's synthetic numbers.
2. Re-run this same measurement shape (or a proper Lighthouse CLI run, if
   run somewhere with more memory than this sandbox had) against the real
   deployed URL, to separate "sandbox artifact" from "real problem" for both
   the LCP outlier and the CLS scores above.
3. The CLS finding is worth investigating directly regardless — check
   whether poster/backdrop images and TMDB-sourced badges reserve their
   final layout space before content arrives, independent of network speed.
