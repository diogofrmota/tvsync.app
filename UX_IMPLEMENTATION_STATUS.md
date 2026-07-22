# TVSync UX implementation status

Audit date: 2026-07-22

Authority: [`UX.md`](UX.md) is the authoritative product and user-experience specification for this audit. Where the current application, [`AGENTS.md`](AGENTS.md), or [`README.md`](README.md) disagrees with it, this document records the disagreement as a conflict; it does not reinterpret `UX.md` to match the code.

Scope: the original repository-wide audit is retained below as a baseline. The implementation update in this section supersedes baseline rows for shared shells, navigation, footer, poster cards, shared states, Home, Home tests, Search presentation, and responsive grids.

## Shared UX foundation implementation update

Implementation date: 2026-07-22

| Area | Current status | Implementation and verification |
| --- | --- | --- |
| Public navigation | **Complete** | The primary header contains exactly **Home / Register / Login**, in that order. Active routes use `aria-current` plus a restrained underline. Public mobile uses the header and has no bottom navigation. |
| Authenticated navigation | **Complete** | Desktop contains exactly **Movies / TV Shows / Search / Profile**. Authenticated mobile hides those header links and exposes the same ordered set in one fixed, safe-area-aware bottom navigation. Session loading no longer displays the signed-out links. |
| Shared shells | **Complete for the shared foundation** | `PageShell` and `PageHeading` establish an 80rem wide shell, consistent 4/6/8 outer spacing, shared vertical rhythm, responsive headings, and a 48rem narrow legal/contact variant. Auth pages use a separate full-height black shell and centered white card. Detail, media overview, library, profile, public profile, Home, Search, legal, and contact surfaces consume the shared shell or its spacing rules. |
| Public Home | **Complete for UX 1.2** | Signed-out copy, benefit order, CTA, section names/order, and footer match `UX.md`. Successful discovery previews render exactly nine unique titles in a 3-column mobile grid and a 9-column desktop grid from the `lg` breakpoint. All four headings and **See All** actions remain present around independent empty, incomplete, and TMDB-error states. Popular sections use TMDB's dedicated popular lists; highest-rated sections sort by vote average with minimum rating and vote-count safeguards (10,000 movie votes; 1,500 TV votes). Each source has an independent one-day server cache. Signed-in `/` redirects to `/movies`, so unauthenticated Home contains no personalized library/statistics content. |
| Poster cards and grids | **Complete for shared behavior** | `PosterCard` now has always-visible titles, accessible detail links, nullable-poster fallback, optional status, progress, and action slots. Shared grids use three mobile columns and expand to six/nine columns. Search, Home, library, overview, recommendations, and public-profile media use the shared card family. |
| Sections and common states | **Complete** | `SectionHeading`, `StatePanel`, and `SectionLoading` standardize headings, descriptions, **See All**, empty/error/success feedback, and nine-card loading placeholders. Horizontal recommendations retain the existing scroll container where appropriate. |
| Mutation feedback | **Complete for affected shared actions** | OAuth and logout actions disable while pending; existing watchlist/tracking/follow/profile actions already use pending state. Shared feedback uses polite/assertive live regions rather than intrusive notifications. |
| Footer | **Complete for navigation and shell** | Public-facing shells expose exactly **Privacy Policy / Terms of Service / Contact** plus copyright. Authenticated shells omit the footer so it cannot conflict with the mobile bottom navigation. `/privacy`, `/terms`, and `/contact` now exist. Legal wording still requires owner/legal approval; contact delivery, persistent rate limiting, and production spam protection remain **Blocked** pending an approved provider/operations design. |
| Accessibility | **Complete for affected shared components** | Header, primary navigation, main, footer, and footer navigation use semantic landmarks; navigation landmarks are named; icon-only and poster actions have accessible names; active links expose `aria-current`; forms have associated Chakra fields; status/error feedback uses live regions; global focus-visible styling remains enabled. |
| Automated checks | **Complete for this refinement** | A dependency-free `node:test` Home UX contract suite now covers exact shell/section order, copy, nine-item enforcement, all **See All** targets, poster routes, public detail access, protected tracking/watchlist/rating mutations with callback context, responsive columns, distinct cached provider queries, and loading/empty/incomplete/API-error states. All seven tests pass. Full Biome lint and strict TypeScript checks pass, and the Next.js 16.2.6 production build passes under Node 24.16.0 using build-only placeholder TMDB/Auth values because real secrets are absent from this workspace. |
| Browser verification | **Complete with environment limitation** | Agent-browser screenshots and accessibility snapshots covered signed-out Home and Login at 1440x1000 and 390x844, the public legal shell, and authenticated Search at desktop/mobile using controlled `/api/auth/session` and TMDB response interception. The authenticated mobile snapshot confirmed one bottom primary nav, no duplicate top primary nav, no footer, and a usable 3-column card/action grid. Real Google OAuth/Neon mutation flows remain unverified because secrets are not present in this workspace. |

## Status definitions

| Status | Meaning |
| --- | --- |
| **Complete** | The current implementation satisfies the stated UX requirement. |
| **Partially complete** | A meaningful part exists, but required content, behavior, state, or presentation is absent. |
| **Missing** | The requirement has no usable implementation. |
| **Conflicting** | The implementation or repository guidance intentionally behaves differently from `UX.md`, including extra user-facing behavior that displaces the specified UX. |
| **Blocked** | Implementation requires an unresolved provider, security, legal, infrastructure, or product decision beyond writing the page itself. |

Statuses describe the current repository, not implementation difficulty. A row can be **Complete** for its narrow requirement while still participating in a cross-cutting accessibility, state-management, or security issue recorded later.

## Executive assessment

The repository has a substantial discovery and tracking foundation, but it is not yet the experience specified by `UX.md`.

- Strong foundations: public TMDB list/detail routes, normalized media data, poster/detail primitives, Google OAuth, server-only Neon access, authenticated watchlist/tracking/rating mutations, episode and season progress, public-profile privacy filtering, pagination primitives, and responsive Chakra layouts.
- Largest specification gaps: local email/password accounts, email verification and password reset, the exact signed-out landing page, signed-in navigation, a unified library model, derived TV progress/status, the specified Search filters/grid, profile/social/favorites UX, trailers, streaming providers, similar-title sections, previous/next episode navigation, follower list pages, and all footer pages.
- Largest conflicts: `AGENTS.md` and `README.md` prescribe Google-only authentication even though `UX.md` requires credentials and Resend; signed-in Home is a personalized dashboard not specified by `UX.md`; Search is public and includes an extra **All** filter; watchlist membership and tracking status are independent records; reviews/recommendations/stats/image-gallery/theme surfaces exceed the specification.
- No test suite, test files, testing dependencies, or `test` script were found. There are therefore no existing tests that directly contradict `UX.md`, but there is also no regression coverage for it.
- The standard validation commands are `pnpm lint`, `pnpm type:check`, and `pnpm build`. They could not be executed in the audit shell because dependencies are absent, direct `pnpm` is unavailable, Corepack fails signature verification, the shell has Node 20.17.0 while this repository requires Node 24, and required environment variables are not configured. See [Existing validation commands and audit result](#existing-validation-commands-and-audit-result).

## Governing-document conflicts

| Source | Conflict with `UX.md` | Required resolution |
| --- | --- | --- |
| `AGENTS.md` Authentication and Environment notes | Explicitly prohibits email/password and reset-password work and defines Google OAuth as the only active option. | When credential work begins, update the guidance in the same change as the approved auth/security design. Until then, `UX.md` remains authoritative and the implementation is blocked/missing, not waived. |
| `AGENTS.md` Navigation notes | Prescribes public discovery links and a signed-in Home/dashboard/Watchlist navigation that differs from the UX headers. | Replace with the signed-out `Home / Register / Login` and signed-in `Movies / TV Shows / Search / Profile` information architecture, while retaining public deep links for browsing. |
| `README.md` Authentication, Dashboard, Routes, and Navigation | Documents the current Google-only, dashboard-first, separate-watchlist behavior as intended. | Update after the target architecture is approved; do not use README prose to override `UX.md`. |
| `README.md` Roadmap and Netlify references | References `ROADMAP.md` and `netlify.toml`, neither of which exists in the inspected tree. | Remove or restore those references in a documentation-only cleanup. This is not a UX blocker. |
| Brand copy | `UX.md` spells the visible brand `TvSync`; the app consistently renders `TVSync`. | Confirm whether case is intentional. Under the current authority rule, visible copy should become `TvSync`. |

## Route inventory

### Existing user-facing routes

| Route | Current access | Current implementation | UX target and status | Relevant files / expected work |
| --- | --- | --- | --- | --- |
| `/` | Public; session-personalized | Signed-out login/register panel, quick search, four discovery shelves. Signed-in welcome dashboard, watchlist preview, upcoming episodes, friend activity, search, then discovery. | **Conflicting**. Signed-out hero copy/layout and 9-card grids do not match; quick search is extra. A signed-in dashboard/Home route is not defined by `UX.md`. | `src/app/page.tsx`; `src/lib/pages/home/index.tsx`; `src/lib/features/dashboard/index.ts`. Recompose the signed-out page exactly; decide whether the extra authenticated dashboard is removed or moved outside primary UX. |
| `/login` | Public; authenticated users redirected | Google-only OAuth page within the global shell. | **Conflicting**. Credentials form, forgot/resend links, auth-card layout, and required copy are absent. | `src/app/login/page.tsx`; `src/lib/pages/auth/*`; `src/lib/services/auth/*`. Implement credentials and verification-aware login after auth design. |
| `/register` | Public; authenticated users redirected | Google-only registration entry plus disabled Apple button. | **Conflicting**. Email, username, password, confirmation, verification, and specified card are absent; Apple affordance is extra. | `src/app/register/page.tsx`; `src/lib/pages/auth/*`. Add secure credentials onboarding and Resend verification. |
| `/movies` | Server-protected | Movie-only view of saved `watchlist_items`, grouped by manual `user_media` status. | **Partially complete**. This is the correct signed-in library destination, but its data model, labels, cards, discover action, states, and removal semantics differ. | `src/app/movies/page.tsx`; `src/lib/pages/watchlist/*`; tracking/watchlist services. Unify library membership and status. |
| `/tv-shows` | Server-protected | TV-only view of saved `watchlist_items`, grouped by manual status. | **Partially complete**. Correct destination and protection; wrong section order, extra states, manual rather than episode-derived membership/status. | `src/app/tv-shows/page.tsx`; `src/lib/pages/watchlist/*`. Derive Watching/Finished and add required discovery/empty UX. |
| `/search` | Public | Debounced TMDB search with All/Movies/TV Shows buttons, list cards, paging, and add-to-watchlist actions. | **Conflicting**. UX places Search in the signed-in experience, requires only Movies/TV tabs, empty-query browsing, genre/sort filters, a responsive poster grid, and current library status. | `src/app/search/page.tsx`; `src/lib/pages/search/multi/index.tsx`; TMDB list/search services. Protect page per UX hierarchy, replace query model and presentation. |
| `/movies/[section]` | Public | Popular overview when unqueried; otherwise TMDB list/discover pages with paging. Includes popular/top-rated/upcoming/now-playing/trending query variants. | **Partially complete**. Supports signed-out **See All** and public browsing, but routes expose extra discovery UX and use 2-column mobile grids. | `src/app/movies/[section]/page.tsx`; media overview/list components. Preserve as public browse targets; align card/grid/container patterns. |
| `/movies/genre/[genre]` | Public | Paginated movie discovery by numeric genre. | **Complete** as supporting public discovery, though not a named page in `UX.md`. | `src/app/movies/genre/[genre]/page.tsx`; movie list service. Keep as a supporting route if Search genre filters link to it or consolidate into `/search`. |
| `/movies/search` | Public | Legacy movie-only search list; the input is rendered only when a query already exists. | **Conflicting**. Extra route that duplicates `/search` and does not implement the specified Search page. | `src/app/movies/search/page.tsx`; `src/lib/components/movie/*`. Redirect/consolidate after the canonical Search implementation. |
| `/movie/[id]` | Public content; mutations server-gated | Movie metadata, TMDB rating, cast/director, watchlist/status/rating, reviews, recommendations, recommend-to-user. | **Partially complete**. Core public detail works; IMDb rating, trailer, streaming, similar titles, favorites, and unified library action are absent. Reviews/social recommendation are extra. | `src/app/movie/[id]/page.tsx`; `src/lib/pages/movie/detail/*`; review/social/tracking features; TMDB services. |
| `/movie/[id]/images` | Public | Client-loaded backdrop/poster gallery. | **Conflicting**. Extra route not specified. | `src/app/movie/[id]/images/page.tsx`; movie image components/service. Retain only if product explicitly accepts extras; otherwise remove navigation/route after regression review. |
| `/tv/[listType]` | Public | Popular overview and paginated airing/on-air/popular/top-rated/trending/discover lists. | **Partially complete**. Supports signed-out public browsing and **See All**; presentation and extra categories exceed the UX. | `src/app/tv/[listType]/page.tsx`; TV overview/list components. Preserve public browse targets and align grids. |
| `/tv/show/[id]` | Public content; mutations server-gated | TV metadata, TMDB rating, cast, seasons, manual status, watchlist, rating, progress summary, reviews, recommendation form. | **Partially complete**. Missing trailer, streaming, similar shows, favorites, season progress on cards, and UX status semantics. | `src/app/tv/show/[id]/page.tsx`; `src/lib/pages/tv/detail/*`; tracking/TMDB services. |
| `/tv/show/[id]/season/[seasonNumber]` | Public content; mutations server-gated | Season metadata, rating, episode list, season-wide and per-episode progress. | **Partially complete**. Missing TV show name and route-specific states; progress does not reconcile the show library status. | `src/app/tv/show/[id]/season/[seasonNumber]/page.tsx`; season page/tracking actions. |
| `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]` | Public content; mutations server-gated | Episode image/title/date/description plus progress and personal rating. | **Partially complete**. Missing TV show name, runtime, IMDb rating, previous/next controls, and next-unwatched indication. | Episode route/page; TMDB episode/show helpers; tracking summary. |
| `/watchlist` | Server-protected | Combined saved movies/TV shows with local search/filter/sort and direct removal. | **Conflicting**. Extra route; `UX.md` puts the library in Movies and TV Shows and does not define a separate combined Watchlist page. | `src/app/watchlist/page.tsx`; `src/lib/pages/watchlist/*`. Migrate or redirect only after `/movies` and `/tv-shows` fully own library behavior. |
| `/profile` | Server-protected | Current-user profile display and edit form on one page, generated avatar, TV-status stats, theme, logout. | **Conflicting**. Viewing and editing are merged; social counts, specified stat cards, favorites, and Edit Profile CTA are missing. | `src/app/profile/page.tsx`; `src/lib/pages/profile/*`. Split view/edit responsibilities and use a shared profile summary/stat system. |
| `/profile/[username]` | Public only for `privacy_setting = 'public'` | Public identity/bio, follow, counts, limited inline follower lists, derived stats/genres, public media, reviews. | **Partially complete**. Required public identity/privacy behavior exists; favorite titles and dedicated follower/following navigation are missing; extra sections are present. | Public profile route/page; `src/lib/features/profile`; database social/tracking helpers. |
| `/stats` | Server-protected | Detailed statistics page with hours, genres, people, completion rate, and period metrics. | **Conflicting**. Extra route; UX requires five horizontally scrollable statistics cards on Profile, not a separate expanded page. | `src/app/stats/page.tsx`; stats feature/page. Reuse correct calculations in Profile or retain only with explicit product approval. |
| `/recommendations` | Server-protected | Recommendations received from followed users. | **Conflicting**. Extra route with no corresponding `UX.md` feature. | Recommendations route/page and social service. Remove/defer or get explicit spec approval. |
| `/person/[id]` | Public | Client-loaded TMDB biography page reachable from cast. | **Complete** as supporting behavior for selecting cast members, though the standalone page is not otherwise specified. | `src/app/person/[id]/page.tsx`; person page/service. Add route-specific error/empty handling. |
| Not-found | Public fallback | Illustration, attribution, and Home action. | **Complete** as a supporting route; not specified in `UX.md`. | `src/app/not-found.tsx`; `src/lib/pages/404.tsx`. Keep; align shared container and heading conventions. |

### Missing UX routes

| Proposed route | Access | Status | Requirement / implementation work |
| --- | --- | --- | --- |
| `/forgot-password` | Public | **Missing** | Auth-card page; non-enumerating reset request; Resend delivery; throttling; audit-safe response. |
| `/reset-password?token=...` | Public with valid one-time token | **Blocked** | New/confirm password, token digest lookup, 24-hour expiry, one-time consumption, invalid/expired recovery link, session invalidation. |
| `/profile/edit` | Protected | **Missing** | Dedicated Edit Profile page or an explicitly approved equivalent route. Must include editable email, password setup/change, and account deletion after the auth model exists. |
| `/profile/[username]/followers` | Public for a public profile; follow mutations protected | **Missing** | Searchable follower list with identity links and per-row Follow/Unfollow. |
| `/profile/[username]/following` | Public for a public profile; follow mutations protected | **Missing** | Searchable following list with identity links and per-row Follow/Unfollow. |
| `/privacy` | Public | **Blocked** | Privacy content page and footer link; production wording requires owner/legal approval. |
| `/terms` | Public | **Blocked** | Terms content page and footer link; production wording requires owner/legal approval. |
| `/contact` | Public | **Blocked** | Validated contact form, confirmation state, delivery/storage decision, spam controls, and rate limiting. |

The UX hierarchy places `/search` under **Logged-In Users** and omits it from signed-out navigation. This audit therefore treats the current public Search page as a route-protection conflict. Public movie/TV browsing remains available through Home **See All** routes and public detail routes, satisfying the separate signed-out browsing requirement.

### Internal route handlers

| Route | Current protection / purpose | Audit finding |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | NextAuth GET/POST with Google provider and JWT sessions. | Correctly server-side, but credentials, verification, password reset, durable account/provider records, and revocation flows are absent. |
| `/api/tmdb/[[...path]]` | Public allowlisted TMDB proxy; filters query parameters and never exposes the API key. | Good secret boundary. Missing video, similar-title, watch-provider, TV external-ID, and several detail paths needed by the UX. No app-level request throttling. |
| `/api/diagnostics/profile` | Requires a readable signed-in session; returns environment booleans, auth state, profile existence/username, and a user-id suffix. | **Security concern:** disable outside development or restrict to administrators; an ordinary authenticated user does not need production configuration diagnostics. |

No `middleware.ts`, `proxy.ts`, nested route layout, route-specific `loading.tsx`, or `error.tsx` exists. Protection is implemented independently in page functions and server actions.

## Shared-component inventory

| Component / pattern | Current consumers and strength | Status against UX / expected work |
| --- | --- | --- |
| `src/lib/layout/index.tsx` | Global shell with shared header, main, footer, max width, and mobile bottom padding. | **Partially complete**. Auth pages need a distinct black/card layout; page containers currently bypass a common width/padding primitive. |
| `src/lib/layout/Header.tsx` | Centralized desktop/mobile navigation with active-route styling and session awareness. | **Conflicting**. Replace nav sets/order/targets per UX, prevent signed-out nav during session loading, and label navigation landmarks. |
| `src/lib/layout/Footer.tsx` | Shared copyright and TMDB attribution. | **Partially complete**. Add Privacy, Terms, Contact; decide footer behavior on auth-card pages. |
| `PosterCard`, `PosterImage`, `PosterLabel` | Reused in shelves, grids, recommendations, and profiles; nullable posters have a fallback. | **Partially complete**. Title is hover-only and unavailable visually on touch/keyboard; add always-visible or focus-visible metadata and required status/quick-action composition. |
| `GridContainer` | Shared movie/TV list grid and loading skeleton. | **Conflicting**. Base is 2 columns and desktop jumps to 8; UX requires 3 mobile columns and responsive available-width behavior. |
| `SliderContainer` | Horizontal recommendation/cast-style shelf wrapper. | **Partially complete**. Overlaps with `OverviewShelf`; normalize section headings, **See All** casing, spacing, scroll behavior, and cards. |
| `OverviewShelf` | Reused Home and movie/TV discovery shelf with 7 initial posters plus a paging action tile. | **Conflicting**. UX Home requires 9 posters simultaneously, 9 desktop columns and a 3x3 mobile grid, not internal next/previous tiles. |
| `DetailMeta` | Shared movie/TV poster, title, year, status, tagline, overview, and action slot. | **Partially complete**. Useful base; enforce an `h1`, stabilize metadata order, and separate provider status from user tracking status. |
| `PageNavButtons` | Shared previous/next and page count. | **Complete** for pagination; add live/loading/error semantics and URL-boundary tests. |
| `MediaOverviewPage` | Shared public movie/TV overview header, search, and section composition. | **Partially complete**. Strong reuse, but not the signed-in library UX and its containers differ from Home/Search. |
| `MediaSearchBar` | Shared media-specific suggestions for public overview pages. | **Partially complete**. Needs combobox/listbox semantics, Escape/outside-click behavior, a no-results state, and consolidation with Search. |
| `WatchlistPage` | Reused for combined Watchlist and dedicated Movies/TV pages. | **Partially complete**. Good reuse, but it encodes the wrong dual-record library model and horizontal cards rather than a shared library poster/status card. |
| `WatchlistButton` / `WatchlistStateButton` | Reused public-detail/search save action with login redirect. | **Partially complete**. Merge into an **Add to Library** status action; expose validation/error/success states; avoid one server request per result card. |
| `MediaStatusControl` | Shared movie/TV manual status selector. | **Conflicting**. Labels differ from UX, there is no remove option, and TV status must derive/reconcile from episodes. |
| `EpisodeProgressButton` / `SeasonProgressControls` | Reused season and episode mutations with auth redirect. | **Partially complete**. Core actions work; add status reconciliation, success/error announcements, batching, and next-unwatched updates. |
| `RatingInput` / `RatingDisplay` | Reused movie, TV, season, and episode personal rating UI. | **Partially complete**. Movie/TV personal rating is required; season/episode ratings are extra. Errors are silently rolled back and controls initially render before auth state resolves. |
| Movie and TV cast wrappers | Parallel dialogs and avatar rows in separate files. | **Duplicated.** Extract one typed `CastSection`/`CastDialog` with character support; add image alt text and consistent empty/search states. |
| Movie and TV list pages | Separate but structurally similar list/grid/pagination implementations. | **Duplicated.** Consolidate query parsing, result states, pagination, grid, and title conventions. |
| Profile/public-profile/stats `StatTile` | Three local implementations of bordered numeric cards. | **Duplicated.** Create a shared horizontally scrollable stat-card rail matching Profile UX. |
| Home/media `SectionHeading`, multiple `EmptyState` blocks, `PosterThumb` cards | Repeated headings, bordered empties, and poster-thumbnail patterns. | **Duplicated.** Create small shared page-container, section-header, empty-state, feedback, and media-card primitives before page rewrites. |
| Auth `AuthPage` | Shared Login/Register Google-only content. | **Partially complete**. Retain shared shell but add mode-specific forms, deterministic back links, validation, and accessibility; remove disabled Apple unless specified. |
| Profile form | Labeled Chakra fields, server validation, duplicate username handling, success/error live messaging. | **Partially complete**. Strong form-state pattern to reuse; fields and actions do not match Edit Profile UX. |
| `getLoginHref` helpers | Repeated in watchlist, tracking, season, episode, and rating controls. | **Duplicated.** Move to the existing auth callback utility/client helper and test open-redirect handling once. |

## Requirement-by-requirement checklist

### 1. Non-Logged-In Users

#### 1.1 Header

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 1.1.1 | Header contains Home, Register, Login. | **Partially complete** | All three exist in `Header.tsx`. | Keep these three and the brand link. |
| 1.1.2 | No other signed-out primary links; order is Home, Register, Login. | **Conflicting** | Movies and TV Shows are inserted; Login precedes Register. Signed-out mobile also uses a bottom bar. | Remove the extra primary items, correct order, and use the signed-out header behavior rather than the logged-in bottom navigation. Public deep routes remain directly accessible. |

#### 1.2 Home page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 1.2.1 | Hero shows `TvSync`, the three exact introductory sentences, five benefit bullets, and **Create an Account**. | **Complete** | `src/lib/pages/home/index.tsx` renders the exact copy/order, semantic benefit list, and `/register` CTA. | Covered by the Home UX contract suite. |
| 1.2.2 | No quick-search block is part of the hero/page specification. | **Complete** | Signed-out Home contains only the hero followed by the four required discovery sections. | The contract suite rejects the removed promotional/search categories. |
| 1.2.3 | Popular Movies: 9 items, **See All**, 9 in one desktop row, mobile 3x3. | **Complete** | Dedicated TMDB popular-movie data is shaped to exactly nine unique items; the grid uses 3 base columns and 9 `lg` columns. | Empty/incomplete/error responses render a state rather than a misleading partial populated grid. |
| 1.2.4 | Highest-Rated Movies of All Time: same count/action/responsiveness. | **Complete** | Exact hyphenated title, nine-item grid, full-list link, vote-average sort, minimum 7 rating, and 10,000-vote safeguard are implemented. | One-day server cache protects the provider. |
| 1.2.5 | Popular TV Shows: same count/action/responsiveness. | **Complete** | Dedicated TMDB popular-TV data uses the same exact nine-item and 3/9-column presentation. | One-day server cache protects the provider. |
| 1.2.6 | Highest-Rated TV Shows of All Time: same count/action/responsiveness. | **Complete** | Exact hyphenated title, nine-item grid, full-list link, vote-average sort, minimum 7 rating, and 1,500-vote safeguard are implemented. | One-day server cache protects the provider. |
| 1.2.7 | Section order is Popular Movies, Highest-Rated Movies, Popular TV Shows, Highest-Rated TV Shows. | **Complete** | One shared ordered title tuple drives loaded and loading states. | Order is contract-tested. |
| 1.2.8 | Footer links Privacy Policy, Terms of Service, Contact, and copyright. | **Complete** | Public footer exposes the three specified links followed by explicit copyright information. | Footer order is contract-tested. |
| 1.2.9 | Create Account opens registration; See All opens full lists; posters open detail pages. | **Complete** | CTA, four query-preserving list targets, and movie/TV poster routes are deterministic. | All targets are contract-tested. |
| 1.2.10 | Anyone can browse public movie/TV information without an account. | **Complete** | Movie, TV, season, and episode routes load public TMDB data without a session redirect. | Public-route access is contract-tested. |
| 1.2.11 | Tracking and watchlist/library management require an account. | **Complete** | Tracking, watchlist, and rating writes authenticate before database mutation; client controls redirect anonymous users to Login with the current pathname/query as callback context. | Auth ordering and callback preservation are contract-tested. |

#### 1.3 Register page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 1.3.1 | Black background and centered white registration card. | **Missing** | Page uses the global shell and a transparent max-width grid. | Add an auth route layout or shell variant with the specified card and mobile-safe sizing. |
| 1.3.2 | Back to Home at top left and `TvSync` branding in the auth experience. | **Missing** | Only the global `TVSync` header link exists. | Add explicit back link and specified brand copy inside/adjacent to the card. |
| 1.3.3 | Heading **Create an Account**. | **Conflicting** | Current heading is **Create your TVSync account**. | Use specified copy. |
| 1.3.4 | Email, username, password, confirm-password fields and **Create Account**. | **Missing** | No credential fields or submit action. | Add client/server validation, accessible autocomplete, password rules, matching confirmation, and pending/success/error states. |
| 1.3.5 | Unique email and username. | **Partially complete** | `profiles` has case-insensitive unique indexes; only OAuth profile setup uses them. | Use the constraints in an atomic credentials registration transaction and map conflicts without account enumeration. |
| 1.3.6 | Secure password hashing and confirmation before submission. | **Blocked** | No password column, hashing dependency, Credentials provider, or auth-account model. | Approve auth architecture; store only Argon2id/bcrypt hashes, never confirmation or plaintext; add password policy and breach-safe logging. |
| 1.3.7 | Verification email via Resend; account inaccessible until verified; resend available. | **Blocked** | No Resend dependency/config, verification-token schema, verified timestamp, or routes/actions. | Add email service/domain, digest-only single-use tokens, expiry, resend throttling, generic responses, and verified-session gate. |
| 1.3.8 | Continue with Google; Google users need no separate verification. | **Partially complete** | Google sign-in exists and bootstraps a profile. | Preserve, explicitly require/validate Google's verified-email claim before email-based profile linking, and surface profile-bootstrap failures rather than silently allowing a broken session. |
| 1.3.9 | Already registered? Log in. | **Complete** | Alternate link is present. | Adjust copy only if exact casing is required. |
| 1.3.10 | No unspecified provider CTA. | **Conflicting** | Disabled **Apple coming later** is visible. | Remove until added to the authoritative UX. |

#### 1.4 Login page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 1.4.1 | Same black/centered-white-card layout, Back to Home, `TvSync`, heading **Login**. | **Conflicting** | Shared Google-only page in global shell; heading is **Log in to TVSync**. | Reuse the new auth shell and exact labels. |
| 1.4.2 | Email address or username, password, Login button. | **Missing** | No Credentials provider or fields. | Add identifier lookup using normalized email/username and constant-time password verification. |
| 1.4.3 | Continue with Google. | **Complete** | Google button and safe callback normalization exist. | Retain; add verified-email/linking tests. |
| 1.4.4 | Forgot password and New user? Create an account links. | **Partially complete** | Registration link exists; forgot-password link does not. | Add `/forgot-password`; use specified copy. |
| 1.4.5 | Invalid credentials show a clear error. | **Missing** | OAuth errors are mapped, but credential attempts do not exist. | Return a generic invalid-credentials message without revealing identifier existence; announce with `role=alert`. |
| 1.4.6 | Unverified users can request another verification email. | **Blocked** | Verification model absent. | Add an unverified state with generic resend response and throttling. |
| 1.4.7 | Password reset request is delivered through Resend. | **Blocked** | Reset page/action/token/email delivery absent. | Implement sections 1.5/1.6 first. |

#### 1.5 Forgot Password page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 1.5.1 | Auth visual style, Back to Login, `TvSync`, **Reset Password**, email field, **Send Reset Email**. | **Missing** | No route or component. | Create `/forgot-password` using the shared auth shell and accessible form. |
| 1.5.2 | Submit the account email and send reset email through Resend. | **Blocked** | No email service or credential account model. | Configure verified sending domain/from/reply-to and server-only Resend client. |
| 1.5.3 | Response never reveals whether the email is registered. | **Missing** | No action. | Always return the same status/body/timing envelope; do not log raw reset tokens. |
| 1.5.4 | Link expires after 24 hours. | **Missing** | No token storage. | Store token digest, user id, expiry, created/used timestamps; enforce server-side expiry. |
| 1.5.5 | Link is single-use. | **Missing** | No token storage. | Consume atomically in the password update transaction and invalidate sibling tokens. |

#### 1.6 Reset Password page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 1.6.1 | Auth style, `TvSync`, **Create a New Password**, new/confirm fields, **Reset Password**. | **Missing** | No route/component. | Create token-bound page and shared password field/validation components. |
| 1.6.2 | Validate confirmation and securely update the password. | **Blocked** | No password hash/account model. | Hash server-side; rotate hash; mark token consumed atomically; avoid exposing token in logs/analytics. |
| 1.6.3 | Redirect to Login on success. | **Missing** | No flow. | Redirect with a one-time non-sensitive success indicator. |
| 1.6.4 | Expired/invalid link offers a new request. | **Missing** | No token validation UI. | Render a generic invalid/expired state linking to `/forgot-password`. |
| 1.6.5 | Existing sessions are handled safely after password reset. | **Blocked** | UX implies account protection, but JWT sessions have no session version/revocation. | Add session-version or token-version checks and invalidate prior credential sessions; document Google-session behavior. |

### 2. Logged-In Users

#### Logged-in header

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.H.1 | Desktop header contains Movies, TV Shows, Search, Profile in that order. | **Conflicting** | Current authenticated set is Home, Movies, TV Shows, Profile. | Remove Home from primary signed-in navigation, add `/search`, preserve exact order and active state. |
| 2.H.2 | Mobile uses a bottom navigation bar. | **Partially complete** | Fixed bottom bar exists, but contains the wrong four routes. | Use Movies, TV Shows, Search, Profile; retain safe-area padding and verify 320-430 px widths. |
| 2.H.3 | Desktop/mobile state remains stable while session loads. | **Partially complete** | Header renders the full signed-out nav while `useSession()` is loading, then swaps. | Render a stable skeleton or server-provided auth state to avoid route flicker and accidental focus movement. |

#### 2.1 Movies

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.1.1 | **Planned to Watch** section for desired movies. | **Partially complete** | Dedicated page groups `planned` items but labels the section **Plan to Watch** and only includes rows also present in `watchlist_items`. | Correct label and make a single library row/status the source of membership. |
| 2.1.2 | **Finished** section for completed movies. | **Partially complete** | `watched` is rendered as **Finished**, but again only for watchlist-hydrated rows. | Preserve label; include all finished library movies. |
| 2.1.3 | **Discover Movies** button opens Search with Movies selected. | **Missing** | Only generic **Search titles** appears in a whole-page empty state. | Add a persistent `/search?type=movie` action with specified label. |
| 2.1.4 | Section order is Planned, Finished, Discover. | **Partially complete** | Status order is planned then watched; Discover is absent. An optional **Saved** section is extra. | Remove uncategorized state from the target model and append Discover. |
| 2.1.5 | Move movies between Watchlist/Planned and Finished; save automatically. | **Partially complete** | Manual selector writes immediately, but Watchlist and status are two independent records. Errors are silently rolled back. | Define **Planned to Watch** as the library status, perform atomic status transitions, show pending/success/error, and revalidate `/movies`. |
| 2.1.6 | Remove movies from the library. | **Conflicting** | **Remove from Watchlist** deletes only `watchlist_items`; `user_media` status remains. There is no delete-status control. | One remove action must delete/reconcile all library state, ratings/progress only if product intends, and update the page immediately. |
| 2.1.7 | Poster opens details. | **Complete** | Movie title/poster card links to `/movie/[id]`. | Retain in the new library card/grid. |
| 2.1.8 | Empty sections show a simple message to discover movies. | **Partially complete** | Status sections show filter-oriented messages only when another item exists; a totally empty library shows one page-level panel. | Keep each required section visible with a direct Discover Movies action and distinguish empty library from no filter matches. |

#### 2.2 TV Shows

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.2.1 | **Watching** means at least one watched episode and not all available episodes. | **Conflicting** | `watching` is a manual `user_media` status unrelated to episode rows. | Derive or transactionally reconcile this status from normalized available episodes and watched rows. Define handling for unaired/special episodes. |
| 2.2.2 | **Planned to Watch** section. | **Partially complete** | Manual `planned` group exists as **Plan to Watch** and depends on `watchlist_items`. | Correct label and unify membership/status. |
| 2.2.3 | **Finished** means all available episodes watched. | **Conflicting** | `completed` can be selected manually with zero watched episodes; marking all episodes does not set it. | Compute completion from episode progress or enforce it atomically; define newly released episode behavior. |
| 2.2.4 | **Discover TV Shows** opens Search with TV Shows selected. | **Missing** | Only a generic empty-state Search action exists. | Add `/search?type=tv` with specified label. |
| 2.2.5 | Required order Watching, Planned, Finished, Discover. | **Conflicting** | Enum order renders Planned, Watching, Completed, Dropped, Paused; **Saved** may also appear. | Render exact required order. Move/drop Paused and Dropped unless the specification is amended. |
| 2.2.6 | Move between Watching/Planned/Finished and save automatically. | **Conflicting** | Manual select works, includes Dropped/Paused, and can contradict episode progress. | Route transitions through a library/progress domain service with explicit invariants and feedback. |
| 2.2.7 | Remove TV shows from library. | **Conflicting** | Watchlist removal leaves `user_media` and episode progress. | Define library removal and whether progress is retained; implement one confirmed action. |
| 2.2.8 | Poster opens TV details. | **Complete** | Cards link to `/tv/show/[id]`. | Retain. |
| 2.2.9 | Progress is calculated using watched episodes. | **Partially complete** | Detail progress summary calculates watched count/percentage; library grouping/status does not. | Reuse one server-side progress projection for detail, library, season cards, and next-unwatched. |
| 2.2.10 | Empty sections show a discover message. | **Partially complete** | Same generic/filter behavior as Movies. | Show each required section and its Discover TV Shows action even when the library is empty. |

#### 2.3 Search

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.3.1 | Tabs are Movies and TV Shows; selected tab defines searched type. | **Conflicting** | Buttons are All, Movies, TV Shows; no tab semantics. | Remove All, implement accessible tablist/tab/panel behavior, and bind `type=movie\|tv` in the URL. |
| 2.3.2 | Search by title. | **Complete** | Debounced query and media-specific endpoints work. | Also support explicit submit per UX; decide whether debounce remains as enhancement. |
| 2.3.3 | Filter by genre. | **Missing** | Static genre names display on cards, but there is no genre control. | Add provider-backed genre configuration/control and `with_genres`; reset page on change. |
| 2.3.4 | Sort by popularity, rating, and release date. | **Missing** | No sort controls. | Use discover endpoints and type-correct sort values; title search endpoint cannot honor all discover sorting, so define query+filter behavior. |
| 2.3.5 | Results update on submit or filter change. | **Partially complete** | Query/filter buttons update the URL and fetch; required filters and a submit flow are absent. | Centralize URL state and loading announcements. |
| 2.3.6 | Browse without a search term. | **Missing** | Empty query renders “Search ... to begin” and makes no request. | Default each tab to a discover/popularity listing. |
| 2.3.7 | Desktop responsive grid; mobile 3 columns. | **Conflicting** | Results are a one-column stack of horizontal cards at every size. | Create shared poster/status/quick-action grid, base 3 columns, responsive width-based desktop columns. |
| 2.3.8 | Display up to 27 initially. | **Missing** | TMDB returns its default page (normally 20); there is no 27-item aggregation/limit. | Fetch/merge enough pages or explicitly choose a provider/page strategy; deduplicate and cap at 27. |
| 2.3.9 | Pagination. | **Complete** | Shared previous/next page control and URL page state exist. | Clamp provider page counts and test tab/filter resets. |
| 2.3.10 | Poster opens detail. | **Complete** | Result image/title links are correct. | Retain in grid. |
| 2.3.11 | Quick add-to-watchlist/library action. | **Partially complete** | Add-only watchlist button exists and redirects signed-out users. | Rename/rework as Add to Library with status selection; batch current-state lookup. |
| 2.3.12 | Existing items show current library status. | **Missing** | Button only shows **In Watchlist**; it does not show Planned/Watching/Finished. | Load all current-user library statuses once and decorate results without N server-action calls. |
| 2.3.13 | Empty, loading, and error states. | **Partially complete** | Instruction, skeleton, no-results, and TMDB error states exist. | Add browse initial state, filter-specific empty text, retry, page-change live status, and state-preserving errors. |

#### 2.4 Profile

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.4.1 | Display name and username. | **Complete** | Profile header displays both with generated avatar. | Retain using a shared profile summary. |
| 2.4.2 | Edit Profile button. | **Missing** | Edit fields are always inline; no view-to-edit action. | Make `/profile` a view page and add a `/profile/edit` CTA/route (or obtain approval for an equivalent mode). |
| 2.4.3 | Following and Followers values open their user lists. | **Missing** | Current-user page has no counts; public page renders plain text and inline previews. | Add linked counts and dedicated list routes. |
| 2.4.4 | Horizontally scrollable stat cards: Movies Watched, Movie Time, TV Shows Watched, TV Time, Episodes Watched. | **Missing** | Current profile has a responsive grid of six TV status counts. Separate `/stats` has different metrics and combines time. | Build shared horizontal rail; calculate movie/TV time separately and define TV-shows-watched semantics. |
| 2.4.5 | Favourite Movies and Favourite TV Shows. | **Blocked** | No favorites table/column/actions; derived “favorite genres” is unrelated. | Choose normalized favorites schema (or library flag), migration, privacy semantics, ordering, and detail actions. |
| 2.4.6 | View own profile information/activity and edit it. | **Partially complete** | Identity/settings/editing exist; activity and required favorites/social summary do not. | Compose a view page from profile, library, follow, favorite, and stat projections. |
| 2.4.7 | Open other profiles; follow/unfollow. | **Partially complete** | Public profile links/actions exist, but no user discovery/search route and signed-out follow displays an error instead of login redirect. | Add user discovery entry point/list navigation and auth-aware follow action. |
| 2.4.8 | Compare statistics with following list. | **Missing** | No compare UI or query. | Define comparison metrics/privacy and implement after exact profile stats. |

#### 2.5 Edit Profile

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.5.1 | Fields: Display name, Username, Email, Biography. | **Partially complete** | All render inline, but Email is read-only; extra Name and Privacy fields are present. | Move to edit page, make email editable after verification design, and decide where extra settings belong. |
| 2.5.2 | **Save Changes**. | **Partially complete** | **Save profile** action validates server-side and reports live success/error. | Rename and retain robust form state. |
| 2.5.3 | Username uniqueness. | **Complete** | Server pre-check plus case-insensitive unique DB index and constraint-error mapping. | Preserve atomic DB constraint as final authority. |
| 2.5.4 | Change Password; Google users can create a password. | **Blocked** | No credential account/password model. | Implement account/provider model, password creation with reauthentication, and secure change-password flow. |
| 2.5.5 | Delete Account with confirmation. | **Missing** | No UI/action. DB FKs cascade but JWT/provider/session cleanup does not exist. | Require recent reauthentication, explicit destructive confirmation, transactional data deletion/anonymization decision, token/session revocation, and provider unlink expectations. |
| 2.5.6 | Update email. | **Conflicting** | UI states Google owns email and server ignores submitted email. | Define provider-vs-login email ownership, uniqueness, re-verification, notification of old/new addresses, and session identity update. |
| 2.5.7 | Validation, pending, success, and error states. | **Partially complete** | Profile text fields have strong validation and live feedback. | Extend to email/password/deletion flows; focus first invalid field and preserve non-sensitive values. |

#### 2.6 Individual Movie Details Page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.6.1 | Poster, title, release year, runtime, release status, genres, description. | **Complete** | Shared `DetailMeta` and movie additional info provide these with fallbacks. | Clarify label so provider release status is not confused with user tracking status. |
| 2.6.2 | IMDb rating. | **Blocked** | UI shows TMDB rating. TMDB supplies `imdb_id`, not IMDb's rating value. | Select/licence a rating provider or amend the UX to TMDB rating; do not relabel TMDB votes as IMDb. |
| 2.6.3 | Trailer playable without leaving the page. | **Missing** | No videos endpoint/player, though CSP already permits YouTube frames. | Add normalized TMDB videos helper/proxy allowlist, choose official trailer, use privacy-enhanced embed, consent/fallback, and responsive controls. |
| 2.6.4 | Cast and Director. | **Complete** | Credits are normalized; cast links to person pages; director is derived from crew. | Extract shared cast component and add accessible image names. |
| 2.6.5 | Streaming availability. | **Blocked** | No watch-provider service. | TMDB can supply watch providers, but a user region/default and attribution/deeplink behavior must be decided. |
| 2.6.6 | Similar movies. | **Conflicting** | Page uses TMDB **recommendations** and labels **Recommended movies**. | Add `/movie/{id}/similar` helper/proxy path and label **Similar movies**, or obtain spec approval to use recommendations. |
| 2.6.7 | Add to Library with status; clearly show/update tracking status. | **Partially complete** | Separate watchlist toggle and status selector exist; status updates are auth-gated. | Replace with one library control whose add flow selects Planned/Finished; remove duplicate state and use UX labels. |
| 2.6.8 | Remove from Library. | **Partially complete** | Watchlist removal exists but does not delete tracking status. | Implement one coherent removal action and confirmation only if destructive secondary data is affected. |
| 2.6.9 | Mark as Favourite. | **Blocked** | No persistence/UI. | Add favorites domain/schema/action after privacy/product decision. |
| 2.6.10 | Rate movie; submit/update personal rating. | **Complete** | Auth-gated 1.0-10.0 half-step save/update/removal exists. | Add success/error announcements and clarify scale if IMDb rating is also shown. |
| 2.6.11 | Cast and similar-title navigation. | **Partially complete** | Cast and current recommendation posters link correctly; true similar titles are missing. | Preserve links after changing endpoint. |
| 2.6.12 | Required section order and no unrelated sections. | **Conflicting** | Backdrop/back button, review editor/list, recommendation-to-user form, gallery, revenue, and social reactions are inserted; required trailer/streaming/similar sections are absent. | Implement required order first; remove/defer extras or document explicit approval. |

#### 2.7 Individual TV Show Details Page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.7.1 | Poster, name, release year, season/episode counts, current provider status, genres, description. | **Complete** | Shared metadata and TV additional info provide these. | Distinguish provider status from tracking status. |
| 2.7.2 | IMDb rating. | **Blocked** | Only TMDB rating is present; no TV external-ID/IMDb-rating provider. | Add external IDs plus approved rating provider, or amend UX. |
| 2.7.3 | Trailer playable in page. | **Missing** | No videos helper/player. | Add normalized TV videos endpoint and shared trailer component. |
| 2.7.4 | Cast. | **Complete** | Normalized credits, dialog, and person links exist. | Consolidate with movie cast and improve image alt text. |
| 2.7.5 | Streaming availability. | **Blocked** | No watch providers. | Same region/provider decision as movie. |
| 2.7.6 | Similar TV shows. | **Missing** | No similar/recommendation shelf. | Add `/tv/{id}/similar` normalized service, proxy path, empty/error state, and linked cards. |
| 2.7.7 | Display all seasons; each shows number, poster, release year, watched progress; select/expand for episodes. | **Partially complete** | Linked cards show number, poster, full air date, count, description. Season 0/specials are filtered and watched progress is absent. | Decide whether “all” includes specials, add release-year formatting and progress projection per season, and preserve selection. |
| 2.7.8 | Add/Remove Library and statuses Watching, Finished, Planned. | **Conflicting** | Separate watchlist/status controls; selector adds Dropped/Paused and uses Completed/Planned labels. | Use exact statuses and derived episode invariants; add coherent remove. |
| 2.7.9 | Mark as Favourite and rate show. | **Partially complete** | Rating works; favorite is absent and schema-blocked. | Add favorites; retain rating feedback. |
| 2.7.10 | Mark an entire season watched/unwatched. | **Partially complete** | Action exists only after opening a season, not from the TV detail season list. | Add accessible controls to each season card or an approved expand interaction. |
| 2.7.11 | Overall progress shown and automatically calculated from watched episodes. | **Partially complete** | Detail loads a calculated count/percentage/next episode, but has no loading/error state and does not drive library status. | Move calculation server-side or add explicit states; reuse projection everywhere and reconcile status. |
| 2.7.12 | Trailer works without navigation; tracking/rating can update. | **Partially complete** | Tracking and rating work with silent rollback errors; trailer absent. | Add trailer and feedback. |
| 2.7.13 | Required section order and no unrelated sections. | **Conflicting** | Reviews/recommend-to-user and extra detail fields are present; trailer/streaming/similar absent; Reviews follows Seasons. | Recompose to authoritative order and defer extras. |

#### 2.8 TV Show Season Page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.8.1 | TV show name. | **Missing** | Page receives only normalized season data and show id; heading is season name. | Fetch/pass show summary and link name back to show. |
| 2.8.2 | Season number/title, poster, description, release year, episode count. | **Partially complete** | All except an explicit release-year presentation exist; full air date is shown. | Format/label release year while retaining full date only if approved. |
| 2.8.3 | Watched progress and episode list. | **Complete** | Watched count and all normalized episodes are shown. | Add progress bar if needed for consistency; preserve counts. |
| 2.8.4 | Mark entire season watched/unwatched. | **Complete** | Both actions exist and are auth-gated. | Batch/transactional implementation is recommended instead of one concurrent query per episode. |
| 2.8.5 | Mark individual episodes watched. | **Complete** | Every episode has a toggle. | Add live feedback and reconcile show status. |
| 2.8.6 | Select episode to open details. | **Complete** | Still/title blocks link to the episode route. | Avoid two adjacent links with duplicate accessible names if card becomes one link. |
| 2.8.7 | Empty/loading/error/success states. | **Partially complete** | No-episode and missing-overview fallbacks exist. Fetch errors become 404; root Home skeleton is used; mutation failures are silent. | Add route-specific loading/error/not-found distinction and live mutation feedback. |

#### 2.9 Individual Episode Details Page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 2.9.1 | TV show name. | **Missing** | Only episode response is rendered. | Load/pass show name and link to TV detail. |
| 2.9.2 | Season/episode numbers, episode title/image, release date, description. | **Complete** | All are normalized and rendered with fallbacks. | Retain. |
| 2.9.3 | Runtime. | **Missing** | Runtime exists in normalized episode data but is not rendered. | Add formatted runtime/fallback. |
| 2.9.4 | IMDb rating. | **Blocked** | Neither IMDb episode rating nor provider integration exists; personal rating control is shown instead. | Select a licensed/provider strategy or amend to TMDB rating. Never present personal/TMDB rating as IMDb. |
| 2.9.5 | Mark Watched / Mark Unwatched. | **Complete** | Toggle label/state exists and is auth-gated. | Add success/error announcements. |
| 2.9.6 | Previous Episode and Next Episode. | **Missing** | Only browser-history Back exists. | Compute neighboring episode routes across season boundaries, disable/omit at edges, and fetch metadata safely. |
| 2.9.7 | Updating an episode automatically updates overall progress. | **Partially complete** | Progress rows immediately affect recalculated detail summary, but manual `user_media` library status is not updated. | Reconcile derived count, next episode, Watching/Finished status, and affected route caches in one domain operation. |
| 2.9.8 | Next unwatched episode is clearly identified. | **Missing** | It appears only in the TV detail client summary. | Show/link the canonical next-unwatched episode after each mutation. |
| 2.9.9 | Required actions/content are not displaced by extras. | **Conflicting** | Season/episode personal rating is extra while runtime and navigation are missing. | Implement required content/actions before retaining optional rating. |

### 3. Social Pages

#### 3.1 User Profile Page

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 3.1.1 | Display name, username, biography. | **Complete** | Public profile header renders all with sensible empty bio. | Retain. |
| 3.1.2 | Follow/Unfollow button. | **Complete** | Button and owner suppression exist; server helper restricts following to public profiles and prevents self-follow. | Redirect signed-out users to Login with callback rather than rendering a raw authorization error. |
| 3.1.3 | Following and follower counts. | **Complete** | Counts are queried and shown. | Make each count a link to its dedicated list. Clarify why count may exceed the visible public-only list. |
| 3.1.4 | Public statistics. | **Partially complete** | Watching, Completed, Movies, Reviews are shown, not the exact Profile metrics. | Share the approved public subset of the five canonical stats and honor privacy. |
| 3.1.5 | Favourite movies and TV shows. | **Blocked** | No favorite persistence or UI. Current favorite genres are a derived extra. | Implement favorites schema/privacy and two poster sections. |
| 3.1.6 | View public profile information and activity. | **Partially complete** | Public media/reviews are shown; explicit activity presentation differs and includes extra review/social features. | Define the required activity projection and reuse privacy-scoped queries. |
| 3.1.7 | Private account information is never displayed. | **Partially complete** | Non-public profile route returns 404 and public media/reviews require public flags. However activity feed exposes watchlist, ratings, and episode progress for any public profile without per-record privacy flags, and the profile query unnecessarily selects email. | Add privacy semantics/filters to every activity source, avoid selecting email for public reads, and add privacy regression tests. |

#### 3.2 Followers and Following Pages

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 3.2.1 | Dedicated Followers and Following pages. | **Missing** | Public profile shows limited inline lists and slices them to eight. | Add two routes backed by paginated/public-safe queries. |
| 3.2.2 | Search bar within the list. | **Missing** | No search UI/query. | Add local search for small sets or indexed server search/pagination for large sets. |
| 3.2.3 | Each row shows display name and username. | **Partially complete** | Inline previews show both. | Extract a reusable `UserListItem` for dedicated pages. |
| 3.2.4 | Each row has Follow/Unfollow. | **Missing** | Inline previews are links only. | Add auth-aware action with optimistic state, pending state, error announcement, and self-row handling. |
| 3.2.5 | Open another user's profile. | **Partially complete** | Inline entries link correctly. | Retain on dedicated pages. |

### 4. Footer Pages

#### 4.1 Privacy Policy

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 4.1.1 | Public Privacy Policy page linked from footer. | **Blocked** | No route/link/copy. | Create page and navigation; owner/legal approval is required before declaring production copy complete. |
| 4.1.2 | Explain collected data and its uses. | **Missing** | No policy. | Cover Google/credential identity, profile text, watch/library/progress, ratings/social/contact data, logs, and analytics. |
| 4.1.3 | Explain authentication protection and external processors. | **Missing** | No policy. | Cover password hashes/token handling once added, Google, Neon, Vercel, TMDB, Resend, Umami when enabled, and retention. |
| 4.1.4 | Explain data access/deletion, cookies, and contact information. | **Blocked** | Account deletion/contact flows are absent. | Align policy with implemented export/deletion/contact procedures and NextAuth/analytics cookie behavior. |

#### 4.2 Terms of Service

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 4.2.1 | Public Terms page linked from footer. | **Blocked** | No route/link/copy. | Create page after owner/legal approval. |
| 4.2.2 | Account responsibilities and acceptable use. | **Missing** | No terms. | Include credential security, content/social behavior, automation/abuse, and age/eligibility decisions. |
| 4.2.3 | Content ownership and service availability. | **Missing** | No terms. | Address user reviews/comments, TMDB attribution/licensing, availability, changes, and backups. |
| 4.2.4 | Suspension/termination, liability limits, term changes, contact. | **Blocked** | No moderation/suspension model or contact channel. | Approve policy/operations, then publish accurate language. |

#### 4.3 Contact

| ID | Requirement | Status | Current evidence | Expected implementation / blockers |
| --- | --- | --- | --- | --- |
| 4.3.1 | Name, email, subject, message, Send Message. | **Missing** | No route/component/action/schema. | Build accessible server-handled form with length/type validation and safe email-header construction. |
| 4.3.2 | Users can ask questions/report problems. | **Blocked** | No delivery address/service/storage decision. | Choose Resend delivery and/or ticket storage, destination ownership, retention, and privacy wording. |
| 4.3.3 | Confirmation after success. | **Missing** | No flow. | Add `role=status`, reset behavior, retryable failure, and idempotency. |
| 4.3.4 | Basic spam protection and rate limiting. | **Blocked** | No limiter/captcha/honeypot. | Choose serverless-compatible per-IP/per-email throttling, honeypot/time trap, payload limits, abuse monitoring, and a CAPTCHA only if needed. Never trust client-only controls. |

### Requirement file index

This index supplies the current and expected implementation boundary for every checklist row in the corresponding UX section. Proposed paths do not exist yet and are recommendations, not changes made by this audit.

| UX section | Current evidence files | Primary implementation files / proposed boundary |
| --- | --- | --- |
| 1.1 and logged-in Header | `src/lib/layout/Header.tsx`; `src/lib/layout/index.tsx`; `src/lib/components/ui/provider.tsx` | Same header/layout plus a shared server-to-client auth-state contract if needed. |
| 1.2 Home/Footer | `src/app/page.tsx`; `src/lib/pages/home/index.tsx`; `src/lib/pages/media/overview-shelf.tsx`; `src/lib/components/shared/PosterCard.tsx`; `src/lib/layout/Footer.tsx`; `src/lib/features/dashboard/index.ts` | Home page and shared Home-grid/section/footer primitives under `src/lib/components` and `src/lib/layout`. |
| 1.3 Register | `src/app/register/page.tsx`; `src/lib/pages/auth/index.tsx`; `src/lib/pages/auth/client-actions.tsx`; `src/lib/services/auth/index.server.ts`; `src/lib/services/database/auth.server.ts`; `database/migrations/0001_initial_tracking_schema.sql` | Register route; shared auth shell/forms; proposed credentials/email services under `src/lib/services/auth` and `src/lib/services/email`; new numbered migration. |
| 1.4 Login | `src/app/login/page.tsx`; `src/lib/pages/auth/*`; `src/lib/services/auth/*` | Login route; shared credentials form; verification-aware server action/provider. |
| 1.5 Forgot Password | No current route/action; absence confirmed in `src/app` and package/schema scans. | Proposed `src/app/forgot-password/page.tsx`, `src/lib/pages/auth/forgot-password.tsx`, server-only reset/email helper, migration. |
| 1.6 Reset Password | No current route/action; JWT sessions in `src/lib/services/auth/index.server.ts`. | Proposed `src/app/reset-password/page.tsx`, shared password form, token/password/session service, migration. |
| 2.1 Movies | `src/app/movies/page.tsx`; `src/lib/pages/watchlist/index.tsx`; `src/lib/pages/watchlist/load-watchlist-items.server.ts`; `src/lib/features/watchlist/*`; `src/lib/features/tracking/*`; `src/lib/services/database/tracking.server.ts`; `src/lib/types/media.ts` | Proposed library feature boundary under `src/lib/features/library`, reusing shared cards/status/progress and a migration/reconciliation tool. |
| 2.2 TV Shows | `src/app/tv-shows/page.tsx`; same watchlist/tracking/database files; TMDB TV season/detail services. | Same proposed library boundary plus a canonical server-side TV progress projection. |
| 2.3 Search | `src/app/search/page.tsx`; `src/lib/pages/search/multi/index.tsx`; `src/lib/services/tmdb/search/multi/*`; movie/TV list services; `src/app/api/tmdb/[[...path]]/route.ts`; watchlist actions. | Search feature/page, shared media grid/card, typed discover/genre helpers, batch library-state server helper. |
| 2.4 Profile | `src/app/profile/page.tsx`; `src/lib/pages/profile/index.tsx`; `src/lib/pages/profile/profile-form.tsx`; `src/lib/features/stats/index.ts`; `src/lib/pages/stats/index.tsx`; tracking/social database helpers. | View-only Profile composition, shared stat rail, favorites and comparison feature boundaries. |
| 2.5 Edit Profile | Current Profile route/form/action and `src/lib/services/database/auth.server.ts`. | Proposed `src/app/profile/edit/page.tsx`; edit page/actions; credentials/email/deletion services; migrations. |
| 2.6 Movie Detail | `src/app/movie/[id]/page.tsx`; `src/lib/pages/movie/detail/**`; shared detail/poster/slider components; reviews/social/tracking/watchlist features; TMDB movie detail/credits/list services and proxy. | Same page plus typed movie videos/providers/similar services, shared trailer/provider/library/favorite components, favorites migration. |
| 2.7 TV Detail | `src/app/tv/show/[id]/page.tsx`; `src/lib/pages/tv/detail/**`; tracking/reviews/social/watchlist features; TMDB TV detail/credits/season services and proxy. | Same page plus TV videos/providers/similar services and shared progress/library/favorite components. |
| 2.8 Season Detail | `src/app/tv/show/[id]/season/[seasonNumber]/page.tsx`; `src/lib/pages/tv/season/detail/index.tsx`; tracking controls/actions; TMDB season/detail services. | Same page plus show-summary handoff and canonical TV progress service. |
| 2.9 Episode Detail | Episode route; `src/lib/pages/tv/episode/detail/index.tsx`; `src/lib/features/tracking/*`; TMDB episode/season/show services. | Same page plus episode-neighbor/next-unwatched projection and shared navigation component. |
| 3.1 Public User Profile | `src/app/profile/[username]/page.tsx`; `src/lib/pages/profile/public-profile.tsx`; `src/lib/features/profile/index.ts`; follow/social helpers; tracking public queries. | Public profile composition plus favorites/stat projection and privacy-safe activity service. |
| 3.2 Followers/Following | Inline `FollowList` in public profile; `src/lib/features/social/follow-button.tsx`; `src/lib/services/database/social.server.ts`. | Proposed nested route pages, reusable user-list item/search, paginated social queries. |
| 4.1 Privacy | No current route; footer is `src/lib/layout/Footer.tsx`; current processors/config are documented in README/env/package/Next config. | Proposed `src/app/privacy/page.tsx` and `src/lib/pages/legal/privacy.tsx`, approved content source, footer link. |
| 4.2 Terms | No current route; footer only. | Proposed `src/app/terms/page.tsx` and `src/lib/pages/legal/terms.tsx`, approved content source, footer link. |
| 4.3 Contact | No current route/action/dependency; CSP/form policy in `next.config.ts`. | Proposed `src/app/contact/page.tsx`, `src/lib/pages/contact`, server-only email/rate-limit helper, environment variables and optional migration. |

Cross-cutting configuration and validation evidence: `AGENTS.md`, `README.md`, `UX.md`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `biome.json`, `knip.ts`, `turbo.json`, `next.config.ts`, `next-sitemap.config.js`, `vercel.json`, `.env.example`, `additional.d.ts`, and `database/migrate.mjs`.

## Cross-cutting findings for audit goals 1-18

### Missing pages and sections

- Pages: Forgot Password, Reset Password, dedicated Edit Profile, Followers, Following, Privacy, Terms, Contact.
- Signed-out Home: authoritative hero/value list/CTA and exact 9-card presentation.
- Signed-in library: persistent Discover buttons and correct empty sections.
- Search: genre/sort controls, empty-query browse state, 27-item grid, current status.
- Profile: social counts/links on own profile, exact horizontal stats, favorites, comparison.
- Details: trailers, streaming availability, true similar titles, favorites; TV season-card progress; episode show name/runtime/IMDb/previous/next/next-unwatched.

### Extra or conflicting user-facing behavior

- Personalized signed-in dashboard/Home, Watchlist Preview, Upcoming Episodes, Friend Activity, and Home search.
- Separate `/watchlist`, `/stats`, `/recommendations`, `/movie/[id]/images`, and legacy `/movies/search` routes.
- Reviews, review likes/comments, recommendation-to-user controls, season/episode personal ratings, image gallery, theme preference, generated-avatar explanatory copy, public favorite genres, public review/activity sections, disabled Apple login.
- Dropped and Paused TV states; uncategorized **Saved** state; independent watchlist and tracking controls.
- These features are not automatically defects. They are **Conflicting** while `UX.md` is authoritative because they affect navigation, ordering, page length, state model, and implementation risk. Retain them only after an explicit spec amendment; hiding their nav does not resolve underlying privacy/regression risk.

### Labels, ordering, and containers

- Brand case `TVSync` versus required `TvSync`.
- **Log in to TVSync** versus **Login**; **Create your TVSync account** versus **Create an Account**.
- **Add to Watchlist** versus **Add to Library**; **Plan to Watch** versus **Planned to Watch**; **Watched/Completed** versus **Finished**; **Recommended movies** versus **Similar movies**; **TMDB rating** versus required **IMDb rating**.
- Public header has extra items and wrong order; authenticated header is missing Search and adds Home.
- TV library order is Planned, Watching, Finished, Dropped, Paused instead of Watching, Planned, Finished, Discover.
- Pages independently use zero, 4/6/8, or centered max-width padding; profile/auth/stats/public-profile use different widths; details use edge-to-edge backdrops; no shared `PageContainer` exists.
- Home/overview uses poster-only hover cards, Search/Watchlist use horizontal bordered cards, season/episode use other bordered cards, and Profile uses a fourth media grid. The UX needs a documented card family and shared responsive grid tokens.

### Desktop and mobile behavior

- Home and shared list grids use two columns at the smallest breakpoint, not three. Overview shelves use two base/four small/eight desktop columns and show seven posters plus an action tile, not 3x3/1x9.
- Search is always a vertical list instead of mobile three-column/desktop responsive grid.
- Public-profile media is two columns on mobile. Watchlist/library cards remain horizontal and are not a poster grid.
- Auth pages are inside the global shell rather than a full black background with centered white card.
- The bottom navigation exists but uses incorrect routes and is also shown to signed-out users. Five signed-out destinations create cramped labels on narrow screens.
- Fixed bottom nav safe-area space is handled in the shell, but focus/scroll behavior after route transitions and virtual keyboard overlap have no browser coverage.

### Authentication and access matrix

| Surface/action | UX access | Current enforcement | Status / work |
| --- | --- | --- | --- |
| Home lists and movie/TV/season/episode/person details | Public | Public server/client reads. | **Complete**. Preserve. |
| Movies and TV Shows libraries | Authenticated | Page-level server redirects. | **Complete**. Protection matches; correct data/UX separately. |
| Search page | Authenticated by placement in UX section 2 | Public. | **Conflicting**. Add page guard; preserve query callback through login if linked while signed out. |
| Current Profile/Edit Profile | Authenticated | `/profile` redirects; edit is inline. | **Partially complete**. Protection matches; dedicated Edit route is missing. |
| Public user profile and follower/following lists | Public only when profile is public | Public profile filters correctly; lists missing. | **Partially complete**. |
| Watchlist/library, status, rating, review, follow, comment, recommendation mutations | Authenticated | Server helpers/actions authenticate. | **Complete**. Server protection matches; several public buttons need a login redirect instead of raw errors and extra actions need spec approval. |
| Forgot/reset/verify/contact | Public entry, securely server-processed | Missing. | **Blocked**. Auth/email/contact infrastructure is unresolved. |
| Stats/recommendations/watchlist extra pages | Not specified | Protected. | Protection is sound, but routes conflict with target IA. |

Page-level guards are duplicated and there is no middleware. Keep authorization in server helpers as the security boundary even if middleware is later added for navigation convenience.

## Data and provider support matrix

| UX data requirement | Current support | Status | Dependency / implementation work |
| --- | --- | --- | --- |
| Unique username/email | Case-insensitive unique indexes on `profiles`. | **Partially complete** | Suitable constraint foundation; credentials registration must use atomic transactions and generic errors. |
| Password authentication | No password/account credential columns, hashes, provider, or dependency. | **Blocked** | Auth architecture and migration; secure hashing; account/provider linking; reauthentication/session revocation. |
| Email verification | No verification state/token/email service. | **Blocked** | Resend/domain/secrets plus digest tokens, expiry, resend limits, verified gate. |
| Password reset | No reset tokens/actions/pages. | **Blocked** | Same infrastructure plus one-time 24-hour tokens and password/session rotation. |
| Editable email | Google email is treated as auth-owned and read-only. | **Conflicting** | Decide canonical identity email, re-verification, provider linking, notifications, and uniqueness. |
| Account deletion | Cascading FKs cover current app tables; no action, reauth, auth-account/session cleanup. | **Blocked** | Deletion policy, recent-auth confirmation, transaction, JWT revocation/versioning, provider expectations. |
| Library/watch statuses | `watchlist_items` and `user_media` both exist independently. | **Conflicting** | Unify around one library aggregate/status source or enforce atomic coupling and migrate orphan rows. |
| TV episode progress | Unique per-user/show/season/episode rows and server actions exist. | **Partially complete** | Derive/reconcile Watching/Finished, next episode, and library views; define specials/unaired/new releases. |
| Favorites | No table/flag. | **Blocked** | Schema/privacy/order/action design and migration. |
| Personal ratings | Numeric half-step ratings support movie, TV, season, episode. | **Complete** for movie/TV; season/episode are extra. | Add feedback and decide privacy for aggregate summaries. |
| Exact Profile stats | Watched movie runtime and TV episode counts exist; TV time uses a show-level runtime estimate; no separate five-card projection. | **Partially complete** | Calculate movie/TV time separately; fetch episode runtime where practical; define “TV Shows Watched.” |
| Followers/following | `follows` table and public-profile queries/actions exist. | **Partially complete** | Paginated searchable lists and per-row current-user state; privacy-consistent counts. |
| Favorite movie/TV lists | No support; favorite genres are derived. | **Blocked** | Favorites schema. |
| Trailers | Current service/proxy lacks the provider's [movie videos](https://developer.themoviedb.org/reference/movie-videos) and [TV series videos](https://developer.themoviedb.org/reference/tv-series-videos) endpoints; CSP already permits YouTube. | **Missing** | Provider supports it; add endpoints/normalizers/selection/player/fallback. |
| Streaming availability | Current service lacks TMDB's regional [movie](https://developer.themoviedb.org/reference/movie-watch-providers) and [TV](https://developer.themoviedb.org/reference/tv-series-watch-providers) watch-provider endpoints. | **Blocked** | Resolve region/product decision, then choose country/locale, endpoint, required JustWatch attribution, offer categories, deeplink behavior, and stale-data messaging. |
| Similar movies/shows | Movie recommendations exist; TMDB's [movie](https://developer.themoviedb.org/reference/movie-similar) and [TV](https://developer.themoviedb.org/reference/tv-series-similar) similar endpoints are not integrated. | **Missing** | Add typed `/similar` helpers/proxy allowlist for movie/TV. |
| IMDb ratings | TMDB movie detail supplies an IMDb id only; the provider also exposes [movie](https://developer.themoviedb.org/reference/movie-external-ids) and [TV](https://developer.themoviedb.org/reference/tv-series-external-ids) external-ID endpoints, not IMDb rating values. | **Blocked** | Select a licensed rating source or amend `UX.md` to TMDB rating. TV/episode IDs also need external-ID resolution. |
| Contact delivery | No form, database, Resend, destination, or limiter. | **Blocked** | Delivery/storage/retention and anti-abuse infrastructure. |
| Legal copy | No content. | **Blocked** | Production copy needs product owner/legal review; then static public routes. |

## State coverage

| Surface | Existing states | Missing or incorrect states |
| --- | --- | --- |
| Global/root | Minimal `HomeLoading` skeleton; custom 404. | Root loader is Home-specific even for every route; no route `error.tsx`, retry, or offline behavior. |
| Home | Dashboard error and empty panels; poster fallbacks. | Discovery failure collapses to no sections/message; no section loading/partial retry; signed-out hero absent. |
| Login/Register | OAuth query errors and missing-config warning. | Credential validation/pending/success, unverified/resend, password/reset states; auth card. |
| Movies/TV library | Whole-library empty, filter-empty, status empty, local sort/search. | Server loading/error/partial TMDB hydration, per-section discover actions, mutation success/error, coherent removal confirmation. Failed TMDB items are silently dropped. |
| Search | Instruction, skeleton, no results, provider error, paging. | Browse initial state, filter/sort validation, retry, current-status loading, 27-item aggregation failures, live result count. |
| Profile | Session and database diagnostic panels; field validation; save success/error. | View-page activity/favorites/social empties, exact stats loading, email/password/delete confirmation/success/error. |
| Details | Nullable poster/overview/cast/recommendation/season fallbacks. Route fetch errors become 404. | Distinguish not-found from provider outage, route-specific loading/retry, trailers/providers/similar states, action success/errors; current-state controls load without skeletons. |
| Season/Episode | No episodes/overview; progress buttons pending. | Route error/loading, mutation error/success announcements, next-unwatched/neighbor edge states. |
| Social | Public-profile empty bio/media/reviews/follows; follow error text. | Dedicated list search/empty/paging, login redirect, action success announcements, privacy-denied state (currently indistinguishable 404). |
| Footer/contact | None. | Legal page availability; contact validation/pending/success/failure/rate-limit/spam states. |

## Accessibility findings

1. **High: poster titles are hover-only.** `PosterLabel` uses `_groupHover` and `visibility:hidden`; it is not revealed by focus and cannot be discovered visually on touch. Keep the accessible link label, but also render visible title/status text or support `:focus-within` without relying on overlays.
2. **High: light theme contrast is inconsistent.** Many pages hard-code `color="white"`, white borders, and dark-specific backgrounds while Profile exposes a Light theme. Either remove the extra theme control under the authoritative UX or replace hard-coded colors with semantic tokens and verify WCAG contrast in both modes.
3. **High: detail pages may lack a semantic page `h1`.** Shared `DetailMeta` and several detail views use `Heading` without an explicit `as="h1"`; confirm generated levels and enforce one descriptive `h1` per route.
4. **Medium: Search “tabs” are ordinary buttons.** Implement tab semantics, arrow-key behavior, selected state, and labelled panels when replacing All/Movies/TV Shows.
5. **Medium: media suggestion dropdown is not a combobox/listbox.** It lacks expanded/controls/active-descendant semantics, keyboard selection, Escape, outside-click dismissal, and no-result feedback.
6. **Medium: cast avatar images omit explicit alternative text in both wrappers.** The surrounding links have labels in the compact row, but dialog images/rows should expose person and character consistently.
7. **Medium: async mutation failures are often silent.** Watchlist, status, episode, season, and rating controls optimistically roll back without `role=alert`; success is also not announced. This prevents assistive-technology users from knowing the result.
8. **Medium: session-driven nav replacement can move focus/content.** Render stable navigation while auth resolves.
9. **Medium: navigation landmarks need names.** Desktop uses `role="navigation"` on an `HStack`; mobile uses `<nav>`; provide consistent `aria-label="Primary"`. Footer/legal nav should have its own label.
10. **Medium: three-column mobile requirement needs touch-target review.** Quick actions cannot be tiny overlay-only controls; cards need readable text, 44px action targets, and no hover dependency at 320-430px.
11. **Low/medium: feedback semantics are inconsistent.** Profile uses `role=alert/status`; auth, reviews, social, and contact-related future forms do not consistently use live regions or focus management.
12. **Low: browser-history Back buttons are nondeterministic.** Provide deterministic route links/fallbacks for auth and hierarchy pages, especially Previous/Next Episode.

## Security findings

### Registration, verification, and password reset

- Do not add credential UI before the storage/provider/token design. The current absence is safer than an incomplete password flow.
- Store password hashes only, using an approved memory-hard algorithm and per-hash salt; never log credentials or tokens. Add server-side password length/strength controls and reauthentication for sensitive changes.
- Verification/reset tokens must be cryptographically random, stored as digests, short-lived, single-use, and consumed atomically. Reset-request responses must not enumerate accounts; resend/reset endpoints require throttling.
- Verification must gate credential sessions until `email_verified_at` exists. Google linking should explicitly accept only a verified Google email before merging a profile by email.
- Current Google JWT callback catches profile-bootstrap failure and still issues a session. This can create an authenticated user with no valid profile/foreign-key parent. Fail sign-in cleanly or provide an atomic repair path.
- Current identity storage has no durable NextAuth adapter/account/provider table. Before mixing Google and passwords, model one user with multiple providers and explicit collision/linking rules; do not infer ownership solely from a submitted email.
- Safe callback URL normalization is a current strength and should receive unit tests for encoded slash/backslash and cross-origin cases.

### Google authentication and sessions

- Secrets and TMDB keys remain server-only; Auth callbacks and mutation helpers enforce the session user id.
- Add recent-auth checks for password/email/account deletion, session-version revocation for password reset/deletion, and explicit Google reauthentication behavior.
- Disable or administrator-restrict `/api/diagnostics/profile` in production because it exposes deployment configuration state and user/profile identifiers to any authenticated account.

### Account deletion

- `ON DELETE CASCADE` covers the present relational tables, but deletion still needs an authenticated, recently reverified, confirmed transaction; email/token/session/provider cleanup; analytics/log retention disclosure; and an idempotent result.
- Decide whether reviews/comments are deleted or anonymized and make Terms/Privacy match. Do not rely on UI confirmation alone.

### Public profiles and social/contact handling

- Public profile lookup correctly requires `profiles.privacy_setting = 'public'`; public media/reviews add item-level public filters.
- `listFollowedActivity` exposes watchlist additions, all ratings, and watched episode rows for followed public profiles without item-level privacy settings. Add privacy columns/policy or exclude these sources. Do not treat a public profile as blanket consent for all private tracking records.
- Follow/review/comment/recommendation mutations authenticate in server helpers, which is good. Add abuse rate limits and normalized error responses before expanding social discovery.
- Future contact handling needs server-side length/type validation, header-injection protection, HTML escaping by the mail template, spam/rate controls, minimal logging, and a published retention policy. A hidden client field alone is insufficient.
- RLS is absent. Application-scoped queries are generally careful, but add database RLS or equivalent defense in depth only with a documented transaction-local user context; never remove current ownership predicates.

## Tests and specification conflicts

The repository now has a dependency-free `node:test` script and `tests/home-ux.test.mjs` for the public Home refinement. The suite contains seven source-contract tests covering UX 1.1/1.2 content and order, exact preview count, responsive columns, links/access, query intent/caching, authorization ordering/context preservation, and all requested Home states.

- Existing tests conflicting with `UX.md`: **none found**.
- Public Home test coverage: **Complete for this refinement**; all seven tests pass.
- Broader product test coverage: **Missing**. The minimum future suites below remain applicable outside Home.
- `pnpm lint`, `pnpm type:check`, and `pnpm build` remain validation checks rather than substitutes for UX/regression tests.
- `README.md`/`AGENTS.md` expectations conflict with other parts of `UX.md` as documented above, but those are documentation conflicts, not tests.

Minimum tests to add alongside implementation:

- Unit: callback URL safety, auth identifier normalization, password/token expiry/one-time consumption, library/status invariants, episode-derived Watching/Finished, next/previous/next-unwatched, provider normalizers, privacy filters, stat calculations.
- Integration: credentials registration/verification/login/reset, Google linking/bootstrap failure, profile update/email uniqueness, account deletion cascades/revocation, contact throttling, library transitions/removal, episode-to-show reconciliation, public/private social queries.
- Component/accessibility: header sets/order, auth forms and errors, 9-card Home grids, Search tabs/filters/grid/status, library empties/actions, stat rail, media controls and live feedback, legal/contact forms.
- Browser: all public and protected routes at desktop/mobile sizes, unauthenticated mutation redirects, keyboard-only operation, focus restoration, and screen-reader smoke checks.

## Recommended implementation order

The user-supplied audit goals are numbered 1-18. The dependency-safe sequence below maps every goal rather than implementing strictly in numerical order.

| Sequence | Audit goals | Work package | Exit criteria |
| --- | --- | --- | --- |
| 1 | **15, 18** | Resolve architecture/security blockers: credentials + provider-account model, password algorithm, verification/reset token model, Resend/domain, session revocation, favorites schema, IMDb source, watch-provider region, contact delivery/rate limiting, legal owner. | Written decisions and migrations/API contracts approved; privacy/security threat model recorded. |
| 2 | **8, 5, 6, 7, 17** | Shared UX foundation: page/auth containers, section headers, empty/feedback states, library/media cards, 3-column mobile grid, 9-card Home grid, stat rail, cast component, semantic colors/headings/navigation. | Story/fixture-level components cover desktop/mobile, keyboard, focus, light/dark decision, and exact labels/order. |
| 3 | **9, 1, 11, 18** | Authentication pages/flows: auth shell, credentials register/login, verification/resend, forgot/reset, Google linking, validation and secure error states. | End-to-end credential and Google flows pass; no enumeration; tokens expire/consume once; unverified users are gated. |
| 4 | **10, 15, 2, 4, 6, 11** | Unify library/tracking domain and migrate data. Make Movies/TV Shows the canonical library; derive TV states/progress; add coherent removal and exact labels/order/empties. | No orphan split-state rows; episode changes deterministically update progress/status; Movies/TV UX matches sections. |
| 5 | **1, 2, 4, 5, 6, 7, 11** | Rebuild signed-out Home and global navigation/footer shell. | Exact hero/copy/order, four 9-item grids, 3x3 mobile, correct signed-out/signed-in nav, stable session loading. |
| 6 | **2, 5, 7, 10, 11, 15** | Rebuild authenticated Search with two tabs, discover mode, genre/sort, 27-item strategy, pagination, quick library action/status. | Query/filter URL behavior, responsive grid, batch status data, all states, and auth guard pass. |
| 7 | **2, 4, 5, 6, 7, 10, 11, 15, 17** | Bring movie/TV/season/episode pages to content/action spec: trailers, providers, similar, favorites, season progress, neighbors/next-unwatched. | Every detail checklist row is complete or only the explicitly external IMDb decision remains blocked. |
| 8 | **1, 2, 5, 7, 8, 11, 15, 17** | Split Profile/Edit Profile; add exact stats/favorites; dedicated follower/following pages and comparison. | Own/public/private states, searchable lists, follow actions, stats, favorites, edit/email/password/delete flows pass. |
| 9 | **1, 2, 11, 15, 17, 18** | Add Privacy, Terms, Contact and approved content/operations. | Footer links work; legal copy approved; contact confirmation, abuse controls, delivery, and privacy retention verified. |
| 10 | **12, 13, 14, 18** | Central access audit after routes settle. Add guards/redirects where required; preserve public reads and server-side mutation enforcement. | Access matrix tests pass for anonymous, unverified, verified, private/public-profile, and owner/non-owner states. |
| 11 | **3** | Remove, relocate, or explicitly specify extras: dashboard, combined Watchlist, Stats, Recommendations, legacy search/gallery, reviews/social recommendation, extra statuses/ratings/theme/Apple. | No extra feature displaces authoritative sections/order; retained extras are documented in a revised UX spec. |
| 12 | **16** (and regression coverage for **1-18**) | Complete automated tests, accessibility checks, browser matrix, and production-like build/deploy verification. | Required commands pass under Node 24/pnpm 11.7 with test suite green and no high-severity a11y/security finding. |

Goal-by-goal coverage summary:

1. Missing pages — sequences 3, 5, 8, 9.
2. Missing sections — sequences 4-9.
3. Extra sections/features — sequence 11.
4. Incorrect names/labels — sequences 2, 4-7.
5. Inconsistent shared visual patterns — sequence 2, consumed thereafter.
6. Incorrect ordering — sequences 2, 4, 5, 7.
7. Desktop/mobile behavior — sequence 2 plus page packages.
8. Duplicated components — sequence 2 and Profile/social extraction.
9. Authentication differences — sequence 3.
10. Tracking/progress differences — sequence 4 and detail reconciliation.
11. Missing states — every feature package, finalized in sequence 12.
12. Missing route protection — sequence 10.
13. Incorrectly protected public pages — sequence 10 preserves public deep content/profile reads.
14. Public actions that need auth — sequence 10 verifies every mutation.
15. Unsupported data/provider needs — sequence 1, then implemented by feature packages.
16. Test conflicts/coverage — sequence 12; no current conflicting tests exist.
17. Accessibility — sequence 2 and acceptance criteria for every package.
18. Security — sequence 1, auth/contact/profile implementation, and final access audit.

## Regression risks

| Risk | Why it is high-impact | Mitigation |
| --- | --- | --- |
| Google identity + credentials convergence | Current `user_id` is based on Google provider account id and profiles are merged by email; adding credentials can duplicate or hijack identity if linking is vague. | Explicit user/account/provider schema, verified-email checks, migration rehearsal, collision tests, and recent-auth linking. |
| Dual watchlist/tracking migration | Existing users can have watchlist-only, status-only, or contradictory rows. | Inventory production data, define canonical mapping, transactional/idempotent migration, backup, reconciliation report, rollback plan. |
| Episode-derived TV status | New episodes, specials, unaired episodes, TMDB corrections, and partial seasons can unexpectedly move Finished back to Watching. | Document “available episode” rule, timestamp/version projections, reconciliation tests, UI explanation, scheduled reconciliation strategy compatible with Vercel constraints. |
| Route/navigation changes | Public discovery routes and protected libraries use overlapping movie paths; links/bookmarks/sitemap can break. | Preserve deep list/detail URLs, add redirects for removed extras, regenerate/exclude sitemap routes, test active states and callback URLs. |
| Static TMDB detail caching plus personalized client actions | Details are force-static while user status loads client-side; rewrites can create stale or flashing personal state. | Keep public data cacheable, batch authenticated state through a stable client/server boundary, add skeletons, test sign-in/out transitions. |
| TMDB request volume | Home, stats, public profiles, progress, 27-result Search, and per-season hydration can exceed free-tier/serverless/provider limits. | Batch/cap hydration, cache normalized public reads, avoid N+1 state calls, partial failure states, observe latency/rate limits. |
| IMDb/streaming data trust | IMDb rating may require another licensed source; providers are region-specific and time-sensitive. | Attribute source/region/date, never mislabel TMDB, handle unavailable/stale data, obtain provider/legal approval. |
| Auth email and token delivery | Misconfigured sender/domain or token leakage can lock out users or enable takeover. | Environment separation, digest tokens, no URL/token analytics, generic responses, rate limits, delivery monitoring, expiry tests. |
| Account deletion | Cascades are irreversible and social/content retention choices affect other users and legal promises. | Recent reauth, typed confirmation, preview of impact, transaction, audit event without sensitive payload, documented retention, recovery/backup policy. |
| Privacy leakage in social activity | Current public-profile assumption exposes watchlist/rating/episode activities without per-item privacy. | Default-private policy, privacy filters at query boundary, RLS/defense-in-depth plan, public/private fixture tests. |
| Removing extras | Dashboard/reviews/recommendations/stats may have real users/data despite not being specified. | Measure usage, preserve data, feature-flag or hide before deletion, provide redirects, obtain explicit product decision. |
| Responsive redesign | Three-column mobile posters and fixed bottom navigation can create unreadable text/small actions. | Test 320/360/390/430 widths, minimum targets, visible labels, no hover-only actions, zoom/reflow at 200%. |
| Theme behavior | Extra light theme currently conflicts with hard-coded white/dark styling. | Either remove it as out-of-scope or fully tokenize and regression-test both themes. |
| No current tests | Broad rewrites can silently alter public routes, authorization, privacy, and provider normalization. | Add characterization tests before migration and requirement tests with each sequence, not at the end only. |

## Validation plan

### Required environments

- Runtime/tooling: Node 24.16 (compatible with package engine `^24.14.0`), pnpm 11.7.0, frozen lockfile install.
- Public data: valid `TMDB_API_KEY`; optional `TMDB_API_URL` only if intentionally overridden.
- Persistence/auth: isolated Neon branch with all migrations, pooled `DATABASE_URL`, unpooled migration URL, stable `AUTH_SECRET`, correct app URL, Google client id/secret.
- Future UX flows: Resend API key/from domain, email recipient fixtures, password/verification/reset schema, contact destination/rate limiter, approved IMDb/provider decision.
- Seed accounts: anonymous; unverified credentials; verified credentials; Google-only; linked Google+password; private profile; public profile with followers/following; empty/new account; rich library/progress account.

### Automated validation

1. Run migration tests on an empty database and a copy with all current migration states/orphan combinations.
2. Run unit/integration/component suites described in [Tests and specification conflicts](#tests-and-specification-conflicts).
3. Run `pnpm lint`, `pnpm type:check`, then `pnpm build` with build-time TMDB configuration.
4. Run a production server from the build and browser tests, not only the dev server.
5. Run an accessibility scanner on every page state, then keyboard and screen-reader manual checks for flows scanners cannot validate.
6. Inspect browser/server logs for hydration errors, failed Server Actions, leaked tokens/PII, CSP violations, TMDB/Neon failures, and unhandled route exceptions.

### Desktop matrix

Use at least 1024x768 and 1440x900 in Chromium, plus one WebKit/Firefox pass.

- Signed out: header exact set/order; Home hero copy/CTA; four 9-poster one-row sections; footer links; public See All/list/detail/person/season/episode navigation; no tracking mutation succeeds anonymously.
- Auth: centered card layout and all credentials/Google/verification/reset states; invalid credentials and non-enumerating reset behavior; callback returns to intended same-origin route.
- Signed in: header exact set/order/active state; Movies/TV sections/order/transitions/removal/Discover; Search tabs/filters/sort/27/paging/status; Profile/Edit/social lists/stats/favorites; details/progress/rating/favorite/trailer/providers/similar; legal/contact.
- Public/private social: public profile content only, private profile denial, owner/non-owner follow states, searchable follower/following lists, stat comparison privacy.

### Mobile matrix

Use 320x568, 360x800, 390x844, and 430x932 with safe-area emulation where available.

- Verify signed-in bottom nav is Movies/TV Shows/Search/Profile, stays above safe area/keyboard, has no clipped labels, correct active state, and no content hidden beneath it.
- Verify signed-out header behavior (not the signed-in bottom nav), auth card reflow, Back links, password-manager/autofill behavior, and no horizontal page overflow.
- Home must show exactly three poster columns and three rows per section; Search must use three columns; titles/status/actions remain visible and touch targets remain usable.
- Check season/episode controls, stat horizontal scrolling, follower list actions, contact fields, dialogs/trailers, orientation changes, 200% zoom/reflow, and reduced-motion preference.

### Unauthenticated and unverified checks

- Anonymous users can open public lists and every detail depth, public profiles, Privacy/Terms/Contact.
- Anonymous users cannot access Movies, TV Shows library, Search (under current UX interpretation), Profile/Edit, or any mutation; redirects retain safe callback URLs.
- Direct Server Action requests without a valid session fail even if the UI is bypassed.
- Unverified credential accounts cannot access authenticated features; resend is generic/throttled; Google verified accounts bypass app email verification.
- Reset/contact endpoints do not reveal account existence, tokens, secrets, stack traces, database/provider configuration, or internal ids.

### Authenticated checks

- Test Google-only, password-only, and linked accounts; duplicate email/username; provider collision; profile-bootstrap/database failure; logout/session revocation.
- Verify every library status transition, remove behavior, episode/season toggle, next-unwatched, all-watched completion, new-episode regression, rating update, favorite toggle, profile/email/password update, follow/unfollow, account deletion.
- Verify database rows are always scoped to `session.user.id`; attempt cross-user ids in every action; confirm private data never appears in public profile/activity/list responses.
- Confirm avatar handling remains text/initials-only unless `UX.md` changes; no file input/upload/object storage path should appear.

### Page-state checklist

For every applicable route verify: initial loading, partial loading, populated, whole-page empty, section empty, filtered no-results, invalid input, provider/database unavailable, unauthorized, forbidden/private, not-found, mutation pending, success, retryable failure, and destructive confirmation/cancel.

## Existing validation commands and audit result

Repository-defined commands:

```bash
pnpm lint
pnpm type:check
pnpm build
```

Other existing scripts recorded from `package.json`:

```bash
pnpm dev
pnpm start
pnpm build:turbo
pnpm check:turbo
pnpm db:migrate
pnpm db:migrate:record-existing
pnpm ultracite:check
pnpm ultracite:fix
pnpm biome:ci
```

Audit-shell result on 2026-07-22:

| Check | Result | Evidence / next action |
| --- | --- | --- |
| Dependency availability | **Blocked** | `node_modules` is absent. Install with the repository package manager under the correct runtime. |
| Node | **Blocked** | Shell is Node 20.17.0; `package.json` requires `^24.14.0` and lockfile/dev runtime records 24.16.0. Use Node 24.16. |
| pnpm | **Blocked** | Direct `pnpm` is not installed. Corepack 0.29.3 fails package-signature key verification. `npx pnpm@11.7.0` also cannot run because pnpm 11.7 requires Node >=22.13 and uses `node:sqlite`. Repair Node/Corepack, then use pnpm 11.7.0. |
| `pnpm lint` | **Not run (environment blocked)** | Run after frozen install under Node 24. |
| `pnpm type:check` | **Not run (environment blocked)** | Run after frozen install under Node 24. |
| `pnpm build` | **Not run (environment blocked)** | In addition to tooling, a valid build-time `TMDB_API_KEY` is required. |
| Runtime/auth smoke tests | **Not run (environment blocked)** | No TMDB, Neon, Auth, or Google variables are configured in the audit shell. Use an isolated configured environment and real Google OAuth as specified above. |
| Test suite | **Missing** | No test script/files/framework were found. Add coverage as part of implementation. |

Do not interpret the environment-blocked checks as code failures or passes. The audit document itself is the only repository change made for this goal.

## Completion coverage

Every section of `UX.md` is mapped above:

- 1.1 Header
- 1.2 Home page
- 1.3 Register
- 1.4 Login
- 1.5 Forgot Password
- 1.6 Reset Password
- Logged-in Header
- 2.1 Movies
- 2.2 TV Shows
- 2.3 Search
- 2.4 Profile
- 2.5 Edit Profile
- 2.6 Movie Detail
- 2.7 TV Show Detail
- 2.8 Season Detail
- 2.9 Episode Detail
- 3.1 User Profile
- 3.2 Followers/Following
- 4.1 Privacy Policy
- 4.2 Terms of Service
- 4.3 Contact

This map should be updated requirement-by-requirement as implementation lands; a status should move to **Complete** only when its implementation, states, access behavior, accessibility, security, and validation evidence all match `UX.md`.
