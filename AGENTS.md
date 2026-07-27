# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## Refactoring in Progress

A structural refactor is planned in `docs/refactor/PLAN.md`, built on the
architecture audit in `BEHAVIOR.md`, `docs/baseline/**`, and
`docs/refactor/**`. Read `PLAN.md` before making any change described below
as a "current structure" note rather than a hard rule — the refactor is
explicitly allowed to change file locations, route rendering modes, and the
UI library, in that plan's order, and should not be treated as violating
this document by doing so.

**Permanent invariants — the refactor must preserve these regardless of
what else changes:** server-only database access through `*.server.ts`;
`TMDB_API_KEY` never reaching client code; the established credentials
auth model (bcrypt, verified-email gating, digest-only tokens,
session-version revocation); Google identity linking rules; storage-free
avatars; every item in "Privacy Compliance Notes" (GDPR/CCPA claims are
tied to code, not a promise); admin dashboard security properties;
migration history staying append-only (never edit or delete a shipped
migration file — add a new one, as `docs/refactor/PLAN.md`'s Phase E1
does for dropping `custom_lists`/`custom_list_items`). The
Chakra-component-as-prop rule below is an invariant *conditional on Chakra
still being in use* — if `docs/refactor/ui-library-decision.md`'s migration
completes for a given file, the rule simply no longer applies to that file,
it isn't being violated.

**One line elsewhere in this document that the refactor will make false,
and should be corrected the moment it happens, not left stale:**
"Environment Notes" states "All App Router routes render dynamically (no
`generateStaticParams`)." `docs/refactor/PLAN.md`'s Phase A moves several
routes to static/ISR rendering specifically to get off that default —
update that line as each Phase A step lands rather than after the whole
plan finishes, so this document never describes a rendering model the code
has already moved past.

The blanket "avoid broad refactors" rule further down is suspended for the
scope and duration of `docs/refactor/PLAN.md` specifically — follow that
plan's ordering and step boundaries instead. It still applies to any change
outside that plan.

## Project Facts

- App name: TVSync.
- Purpose: TV show and movie tracker/discovery app.
- Framework: Next.js App Router under `src/app`.
- Language: TypeScript with strict mode.
- UI library: Chakra UI 3.
- Package manager: pnpm.
- External API: TMDB.
- Deployment target: Vercel free tier.
- Database: Neon Postgres through Vercel Marketplace.
- Auth: Auth.js/NextAuth with verified email/password credentials and Google OAuth.

## Working Rules

- Do not add major product features until `docs/refactor/PLAN.md` lands — the architecture is now documented (`BEHAVIOR.md`, `docs/baseline/**`, `docs/refactor/**`); this refactor is the next thing that should happen before resuming feature work, not a precondition still waiting to be met.
- Keep route files in `src/app` thin; route UI belongs in `src/lib/pages` and reusable pieces in `src/lib/components`.
- Keep the global app shell and primary navigation in `src/lib/layout`; route links should stay aligned with the shared header navigation.
- Keep TMDB access behind `src/lib/services/tmdb`, and OMDb (genuine IMDb ratings) behind `src/lib/services/omdb`.
- Do not expose `TMDB_API_KEY` to client code. Client components should use existing SWR hooks that call `/api/tmdb`.
- Add TMDB endpoints as typed server/client helpers under `src/lib/services/tmdb/**`, with endpoint-specific `types.ts` contracts and `utils.ts` normalizers.
- Normalize TMDB response data at the service boundary for nullable posters, backdrops, dates, overviews, credits, seasons, and episodes before page UI consumes it.
- Keep direct database access server-only through `src/lib/services/database/**.server.ts`.
- Use `DATABASE_URL` for pooled Neon runtime access. Use `DATABASE_URL_UNPOOLED` for migration tooling and direct `psql` schema application.
- Do not add database tables until persistence work is explicitly started.
- Keep personal tracking queries behind `src/lib/services/database/tracking.server.ts` or another server-only database helper that verifies the authenticated user id before reading or mutating private rows.
- Keep email/password authentication on the established credentials account model: bcrypt hashes only, verified-email gating, digest-only one-time verification/reset tokens, database-backed throttling, and session-version revocation after password reset.
- Keep Google identity linked through `auth_accounts` using Google's stable provider account id. Only link by email after Google supplies a verified-email claim; reject conflicting provider mappings.
- Do not use object storage for user avatars. The profile avatar is either the TMDB poster path of a title the user picked in search (`profiles.profile_avatar_path`/`profile_avatar_title`) or initials generated from the display name — no upload path, file input, or stored image bytes.
- Keep current-user profile editing in `src/lib/pages/profile` with mutations flowing through server-only actions/helpers and database uniqueness checks.
- Keep shared app domain contracts in `src/lib/types`.
- Place new feature-specific code under the matching `src/lib/features/*` boundary once the feature is ready for implementation.
- Prefer existing Chakra UI patterns and the local theme in `src/lib/styles/theme`.
- Chakra UI 3 ships its components as client components, so a Server Component must never hand one of them a component as a prop (`as={SomeIcon}`, `icon={...}`). React cannot serialize a function across that boundary and the whole route falls back to the error page. Render the icon as a child of a styled element instead — see `src/lib/components/shared/FavoriteHeart.tsx` — or mark the wrapper `'use client'`. `tests/server-component-boundaries.test.ts` guards this.
- Use the `lib/*` import base configured by `tsconfig.json`.
- Avoid broad refactors, dependency churn, or unrelated formatting-only edits — except for the structural refactor tracked in `docs/refactor/PLAN.md`, which is explicitly scoped, ordered, and exempted from this rule for its own steps. See "Refactoring in Progress" above.

## Folder Boundaries

- `src/app` - App Router routes, layouts, API route handlers, and route metadata.
- `src/lib/layout` - Global app shell, header/navigation, and footer.
- `src/lib/pages` - Route-level UI composed by App Router pages.
- `src/lib/components` - Shared and domain-specific reusable UI components.
- `src/lib/features` - Feature modules: `auth`, `contact`, `library`, `profile`, `reviews` (personal ratings), `social` (follow graph), `tracking`, and `watchlist`.
- `src/lib/services/admin` - Server-only admin session helpers plus the pure signing/verification primitives behind them.
- `src/lib/pages/admin` - The single `/admin` dashboard page and its client sections.
- `src/lib/services/auth` - Server-only Auth.js/NextAuth configuration.
- `src/lib/pages/auth` - Login/register route UI and client auth actions.
- `src/lib/services/database` - Server-only Neon Postgres helpers for Server Components, Server Actions, and Route Handlers.
- `src/lib/services/tmdb` - TMDB clients, endpoint helpers, response types, and TMDB-specific utilities.
- `src/lib/services/omdb` - Server-only OMDb client for genuine IMDb rating values.
- `src/lib/types` - App-level types such as `MediaType`, `WatchStatus`, `RatingValue`, `PrivacySetting`, `UserProfile`, `UserMedia`, and `EpisodeProgress`.
- `src/lib/styles` - Chakra theme and global CSS.
- `src/lib/utils` - Cross-cutting utility functions.
- `database/migrations` - SQL migrations for the Neon Postgres schema.

Two known deviations from these boundaries, scheduled for
`docs/refactor/PLAN.md`'s Phase C, not yet fixed: `BackButton` currently
lives under `lib/pages/movie/detail/components` despite being imported by
TV pages too (belongs in `lib/components/shared`), and `/privacy`/`/terms`
hold their full content directly in `src/app` instead of delegating to
`lib/pages/legal` like every other route. See `docs/refactor/boundaries.md`.

## Validation

Run these before handing off changes:

```bash
pnpm test
pnpm lint
pnpm type:check
pnpm build
```

Only fix small existing errors that block these checks unless a task explicitly requests broader work.

For final product verification, also smoke-test the public routes (`/`, `/explore`, movie detail, TV show detail, season detail, and episode detail) and the authenticated routes with real Google OAuth plus Neon environment variables. Protected flows include profile editing, generated avatar display, watchlist mutations, watch status changes, episode progress, ratings, public profiles, social follows, and statistics. Keep this pass focused on stability fixes; do not add major features.

Confirm avatar handling remains storage-free: a TMDB poster path chosen in search, or generated initials, with no upload paths, file inputs, object storage dependencies, or user-uploaded profile image persistence.

## Database Notes

The initial tracking schema is in `database/migrations/0001_initial_tracking_schema.sql` and creates `profiles`, `user_media`, `episode_progress`, `ratings`, and `watchlist_items`.

The authentication lifecycle schema is in `database/migrations/0005_auth_lifecycle.sql`. It adds provider mappings, verified-email/session-version state, one-time verification/reset token digests, and persistent authentication rate-limit counters.

Personalized lists were removed from the product. `database/migrations/0010_personalized_lists.sql` stays in the migration history so applied databases keep matching the recorded migrations, but `custom_lists` and `custom_list_items` are no longer read or written by the app. Do not add UI, routes, or helpers back on top of those tables.

The admin schema is in `database/migrations/0011_admin_dashboard.sql`. It adds the `profiles` moderation columns (`banned_at`, `ban_reason`), the global `discovery_list_settings` rows behind Home and Explore, and the append-only `admin_audit_log`.

The admin-curated list schema is in `database/migrations/0013_admin_curated_lists.sql`. It adds the global `admin_curated_lists` and `admin_curated_list_items` tables behind the dashboard's "Custom lists" panel, including the `active`/`show_on_home`/`show_on_explore`/`position` placement the public surfaces read. They are operator-owned and reference no user, which is what separates them from the removed per-user `custom_lists` tables.

The profile avatar schema is in `database/migrations/0015_profile_avatar.sql`. It adds `profiles.profile_avatar_path`/`profile_avatar_title` — the TMDB poster path behind the circular avatar — and drops the `profile_backdrop_path`/`profile_backdrop_title` columns the removed horizontal profile poster used. Apply it after the matching deploy, since the previous release still selects the dropped columns.

The privacy schema is in `database/migrations/0012_privacy_compliance.sql`. It adds `profiles.analytics_opt_out` and `profiles.privacy_choices_updated_at` — the only data-subject right that needs storage, since access, portability, and erasure all read or delete tables that already exist.

- Apply migrations with `DATABASE_URL_UNPOOLED`; use pooled `DATABASE_URL` only for runtime app queries.
- Duplicate user/media records are guarded by database unique constraints.
- Common owner, media, status, public-read, and date ordering lookups should have matching indexes before related UI or API work ships.
- Watchlist mutations should use the existing server-only watchlist actions/helpers and rely on the `(user_id, tmdb_id, media_type)` unique constraint to prevent duplicates.
- Watch status mutations should use `src/lib/features/tracking` Server Actions and `src/lib/services/database/tracking.server.ts`. Movies support `planned` and `watched`; TV shows support `planned`, `watching`, `completed`, `dropped`, and `paused`.
- Episode progress mutations should stay server-only through the tracking helpers and the `episode_progress` unique `(user_id, tmdb_show_id, season_number, episode_number)` constraint. TV progress summaries should derive watched counts, percentage, next episode, watched seasons, and last watched date from Neon plus normalized TMDB season data.
- Row-level security is not enabled yet. Authorization is enforced in the application/query layer by deriving `session.user.id` from NextAuth and scoping personal reads/mutations to that id.
- Users may only modify their own personal tracking rows. Public profile reads must honor `privacy_setting = 'public'` where practical.
- If RLS is added later, document exactly how the app sets transaction-local Neon context, such as `set_config('app.current_user_id', userId, true)`, and keep server-side query authorization checks as defense in depth.
- The public Contact form reuses the existing scope-keyed `auth_rate_limits` table (via `consumeAuthRateLimit` in `src/lib/services/database/auth.server.ts`) for both submission throttling and short-window duplicate-submission detection instead of adding a new table.

## Admin Dashboard Notes

`/admin` is one credential-gated page, separate from user authentication. It is not linked from any navigation, renders outside the app shell, and is excluded from the sitemap and robots.txt.

- Access is `ADMIN_USER` + `ADMIN_PASSWORD` compared in constant time, then a stateless signed cookie (`src/lib/services/admin/security.ts`). The signing key is derived from `AUTH_SECRET` and a digest of the credentials, so rotating the password or the secret invalidates every issued admin cookie with no server-side session store. Sessions last eight hours; the cookie is `httpOnly`, `sameSite=strict`, `secure` in production, and scoped to `/admin`.
- Sign-in attempts are throttled through the existing scope-keyed `auth_rate_limits` table (`adminLogin` rule). Every mutation in `src/lib/features/admin/actions.ts` re-verifies the session with `requireAdminSession()` before touching data; a rendered dashboard is never treated as authorization.
- Privileged actions are appended to `admin_audit_log` with the actor, target, and an `AUTH_SECRET`-keyed digest of the request IP — never a raw address. The nightly cleanup cron purges entries older than 90 days.
- Moderation sets `profiles.banned_at`/`ban_reason` and rotates `session_version`. A banned profile stops answering the session-version read, so live sessions fail their next request, credentials logins raise `ACCOUNT_BANNED_ERROR`, and Google sign-in is refused.
- The entry point says what it is: the login panel reads "TvSync - Admin Access" over "Access to this space is restricted.", its submit button is "Enter", and the signed-in dashboard carries the same "TvSync - Admin Access" heading.
- The overview is four tiles and nothing else: Users, Banned users, New users (30 days), and Active users (30 days). The two 30-day tiles state their percentage change against the previous 30 days through `formatAdminChange` (`src/lib/pages/admin/format.ts`), which reports "No previous 30 days to compare" rather than dividing by zero. Every figure is counted exactly by `ADMIN_ACCOUNT_STATS_QUERY` and `ADMIN_ACTIVE_USERS_QUERY`; the verified/public/provider/table-estimate counters and the "Latest signups" panel were removed, along with the queries behind them. The overview is cached for 60 seconds with an explicit recalculate control.
- "Custom lists" (`src/lib/pages/admin/curated-lists.tsx`) are operator-curated collections in `admin_curated_lists` / `admin_curated_list_items` (`database/migrations/0013_admin_curated_lists.sql`). An admin names a list, searches TMDB from `searchCuratedListCandidates`, and adds or removes titles one at a time. The search runs server-side through the existing TMDB service helpers, so `TMDB_API_KEY` never reaches the browser; adding a title already on a list is a no-op rather than an error. These are unrelated to the removed per-user `custom_lists` tables — do not build on those.
- A custom list is published to the public surfaces from the same panel: `active`, `show_on_home`, `show_on_explore`, and an explicit order, saved for the whole table in one `saveCuratedListPlacement` payload so Home and Explore never observe half a reordering. A list starts unpublished, and an empty list is never rendered whatever its placement says.
- Pure formatting helpers for the dashboard live in `src/lib/pages/admin/format.ts` rather than in the client-only `panels.tsx`, so the contract tests can assert on them without loading Chakra.
- Home/Explore list management lives in `discovery_list_settings`: active, per-surface placement, order, `item_limit` (the "See All" size), `refresh_interval_hours`, and `cache_epoch`. Reads go through `loadDiscoveryListSettings` (cached app-wide for five minutes, tag-busted on save) and fall back to `DEFAULT_DISCOVERY_LIST_SETTINGS` whenever Neon is unreachable, so discovery survives a database outage. "Fetch now" bumps the cache epoch and purges the list's cache tag, which drops the cached TMDB response at both the list and fetch layers.
- The "Privacy requests" panel (`src/lib/pages/admin/privacy.tsx`) answers GDPR/CCPA requests that arrive out of band from someone who cannot reach Settings → Privacy. It builds the same JSON export the user can download for themselves, and it erases an account after the username is typed back exactly. Both actions re-verify the admin session, are written to `admin_audit_log` as `privacy.export` and `privacy.erase` against the username only, and never log or store the exported data — it goes straight to the browser as a download. The panel also reports the analytics opt-out count and the audit-log retention period.

## Privacy Compliance Notes

TvSync is operated as GDPR- and CCPA-compliant, and every right the Privacy Policy (`src/app/privacy/page.tsx`) claims is served by code rather than by a promise. Keep it that way: a change that removes one of these has to change the policy in the same commit.

- Access and portability are `Download My Data` in Settings → Privacy (`/profile/settings/privacy`) → `exportOwnPersonalDataFile` → `exportOwnPersonalData` (`src/lib/services/database/privacy.server.ts`). The JSON is built on request and handed to the browser; no copy is stored anywhere.
- Every export query in `src/lib/services/database/privacy-queries.ts` is scoped by `user_id` in its own where clause, so a request can never widen past the account it names. Password hashes, one-time token digests, and rate-limit counters are never exported.
- Rectification is the existing profile editor; erasure is the existing `Delete Account` dialog and its cascading delete of `profiles`.
- Objection (GDPR Art. 21) and the CCPA opt-out are served at render time by the `Sec-GPC` signal. The account-level flag `profiles.analytics_opt_out` still backs it (`updateOwnPrivacyChoices`), so an objection raised through Contact follows the account across devices, but Settings → Privacy no longer exposes a switch for it — Privacy Choices there is a statement plus `Download My Data`.
- `isAnalyticsAllowed` (`src/lib/services/analytics/consent.server.ts`) gates the Umami script in the root layout. It withholds the script for a `Sec-GPC: 1` request from any visitor, signed in or not, for a signed-in account that opted out, and for a database it cannot read — the failure path never assumes consent. Analytics must stay withheld at render time; do not "disable" it client-side after loading it.
- Do not add non-essential cookies, third-party advertising, cross-context sharing, or profiling. The product's only optional processing is the anonymous analytics above, which is what lets the policy say there is no consent banner and nothing to opt out of beyond that switch.

## Navigation Notes

Primary navigation currently lives in `src/lib/layout/Header.tsx` and is centered on desktop. Signed-out users see Home, Register, and Login. Signed-in users see Movies, TV Shows, Search, and Profile.

- Use `/movies` as the authenticated Movies library link and `/tv-shows` as the authenticated TV Shows library link. Public discovery lists remain available through their existing deep routes.
- Use `/explore` (labeled "Explore") as the authenticated search/browse link.
- Keep the legacy `/watchlist` route auth-protected while library behavior migrates to the Movies and TV Shows routes; do not restore it to primary navigation.
- Watchlist items should show and update the current user's saved watch status where available.
- Keep `/profile` auth-protected. It opens with the settings action on its own line, then a centred identity block: the circular avatar, the display name plus `@username`, follow-count chips linking to `/following` and `/followers`, and the biography when present. There is no horizontal profile poster/backdrop header — `ProfileAvatarPicker` (`src/lib/pages/profile/profile-avatar-picker.tsx`) is the whole of it: clicking the avatar opens a TMDB search dialog, and picking a title saves that poster's path through `updateOwnProfileAvatarSelection`. Current-user profile editing should save name, username, display name, bio, and privacy setting to Neon through server-only code; Google email remains auth-owned unless the auth design changes.
- Keep the settings entries at one page each under `/profile/settings/*` — `profile`, `account`, and `privacy` — never anchors into one combined editor. The index (`/profile/settings`) carries a "Back to Profile" action and every sub-page a "Back to Settings" action, both from `src/lib/pages/profile/settings.tsx`. `/profile/edit` is a permanent redirect to `/profile/settings/profile` and holds no UI of its own. Do not list a setting the app does not store: the theme is forced dark and there is no notification system, so neither is offered.
- Maintain both desktop active-route styling and the mobile bottom navigation when adding or changing primary routes.
- Keep the signed-out Home page discovery-focused: title/subtitle hero, trending TV shows, trending movies, and a 16-title weekly popular mix are appropriate. Do not add a quick-search block to the home hero.
- Signed-in users are redirected from `/` to `/movies`; there is no separate personalized home/dashboard. Keep the root route (`src/lib/pages/home`) as the signed-out discovery experience.
- Render the `/explore` featured area as the `ExploreHero` slideshow: up to `EXPLORE_HERO_SLIDE_COUNT` (10) trending titles that advance automatically every five seconds and can also be moved with the arrows or slide dots. Every slide shows the poster, the title, a star with the genuine IMDb rating (falling back to the clearly labeled TMDB score), a trailer link built from the trusted YouTube trailer selectors, and a link to the detail page. Slide data is shaped server-side in `src/lib/pages/explore/hero-slides.server.ts`; missing trailers or IMDb ratings degrade to omitted extras instead of blanking the slideshow.
- Published admin custom lists render ahead of the discovery rails on both Home and `/explore`, through the same `MediaRail` so an editorial list is visually indistinguishable from the rest of the page. They are read once per surface through `loadCuratedRails` (`src/lib/pages/media/curated-rails.server.ts`) over the app-wide cached `loadPublicCuratedLists`, which costs no TMDB request at all — the poster and title were captured when the admin added the entry. A list's "See All" opens `/lists/[id]`, which resolves published lists only, so an unpublished draft is a 404 rather than a page anyone who guesses the id can read. One list may mix movies and TV shows; each item carries its own `mediaType`.
- Home and `/explore` render one shared set of discovery rails. The rail keys, names, and page selections live in `src/lib/pages/media/discovery-rails.ts`; the cached TMDB reads and "See All" targets live in `src/lib/pages/media/discovery-rails.server.ts`. A page picks rails by key and never queries a list of its own, so a section both pages show carries the same name and the same titles. Explore additionally reads `loadTrendingDiscoveryResults` for its featured slideshow, which is the same cached trending response its trending rails use.
- Keep the `/explore` page discovery-focused: the featured hero plus the trending, upcoming, popular, and highest-rated rails. There is no "Recommended for you" rail and no genre browser. A `?query=` term replaces the landing with `src/lib/pages/search/results`: one grid of the movies and TV shows related to the term, merged and ordered by TMDB popularity, with no content-type tabs, genre filter, sort control, or pagination. Logged-out visitors are sent to login before saving library items.
- Render every list preview (signed-out Home, `/explore`, the Movies/TV overviews, and every `/profile` section) with the shared horizontally scrollable rail in `src/lib/components/shared/MediaRail.tsx`. Keep the preview size in `MEDIA_RAIL_ITEM_LIMIT` (20 posters) instead of restating it per page, and do not reintroduce a page-specific poster grid preview. The rail shows posters only: "See All" is the single action on the section title line, never repeated as a tile at the end of the rail. One TMDB page is 20 titles, so a rail is one request per section — a rail that comes back short renders the titles it has instead of spending extra calls against the shared API budget.
- Keep `/profile` sections in this order: Statistics (with "See All" opening `/profile/statistics`), Reviews, TV Shows, Favourite TV Shows, Movies, Favourite Movies. A statistics card is its label and its value only — a watch total is never annotated as a "Partial total" because TMDB withheld some runtime; titles with no runtime are simply not counted.
- The profile Reviews section is the account's own written reviews, in the film-diary shape: poster, title, the rating it was filed under, and the review text (`src/lib/components/profile/ProfileReviews.tsx`). It previews `PROFILE_REVIEW_PREVIEW_LIMIT` reviews with "See All" opening `/profile/reviews`. Only whole-movie and whole-show reviews are listed, because season and episode rows carry no poster of their own. Favourite sections put the title first and the marker after it: pass `titleIcon={<FavoriteHeartIcon />}` (`src/lib/components/shared/FavoriteHeart.tsx`) to the rail or page heading instead of prefixing the title with a heart emoji. Every section is a `MediaRail` with a "See All" target; the complete lists live at `/tv-shows`, `/movies`, and `/profile/favorites/[mediaType]`.
- Keep the poster quick actions in `src/lib/features/library/media-quick-actions.tsx` and render them from `PosterCard` only; every movie/TV item shows the yellow plus (add to library), then the "Added" chip plus the heart that turns red for favourites.
- Library chips are for discovery surfaces only. Pass `libraryBadges={false}` from the user's own library surfaces (`/movies`, `/tv-shows`, `/profile`, and `/profile/favorites/[mediaType]`) so neither the "Added" chip nor a Watching/Planned to Watch/Finished label is repeated on titles the user already knows are saved. `/explore`, the discovery lists, and other users' profiles keep the chips.
- Show watch progress on the artwork instead of in text: `PosterCard` draws a bar across the bottom of the poster that fills in `gold.400` while a title is in progress and turns `green.400` at full width once it is finished. A title that has not been started renders no bar, and no page prints a watched percentage or an episode counter under a poster.
- Load the signed-in user's library/favourite snapshot once per page through `MediaLibraryProvider` (`src/lib/features/library/media-library-provider.tsx`). Surfaces that show library state (poster quick actions, search status selects) read and write that context instead of keeping their own copy.
- Keep the "See All" list routes (`/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]`) server-rendered through `src/lib/pages/media/media-list.server.tsx`: one complete list of up to 30 titles in a single grid, with no page navigation. `/explore` search results are a single unpaginated grid as well.

## Environment Notes

Required:

- `TMDB_API_KEY`
- `ADMIN_USER` and `ADMIN_PASSWORD` before the `/admin` dashboard opens. Both, plus `AUTH_SECRET`, are required; with any of them missing the route renders a "not configured" panel instead of a login form.
- `DATABASE_URL` before using Neon-backed features.
- `AUTH_SECRET` before production auth sessions are enabled.
- `RESEND_API_KEY` and `AUTH_EMAIL_FROM` before credential registration, verification, or password-reset email delivery is enabled.
- `CONTACT_EMAIL_TO` before the public Contact form can deliver mail. Contact reuses `RESEND_API_KEY` and falls back to `AUTH_EMAIL_FROM` when `CONTACT_EMAIL_FROM` is unset.

Optional:

- `TMDB_API_URL`
- `OMDB_API_KEY` before movie/TV detail pages can show a genuine IMDb rating value. Without it the detail pages show the clearly labelled TMDB score and the TMDB age certificate only; a TMDB score is never relabelled as an IMDb one.
- `DATABASE_URL_UNPOOLED` for migration tooling.
- `AUTH_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_EMAIL_REPLY_TO`
- `CONTACT_EMAIL_FROM`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_SRC`

`TMDB_API_KEY` is required at runtime for discovery and detail content. All App Router routes render dynamically (no `generateStaticParams`), so the build itself does not call TMDB. **This line is scheduled to become false**: `docs/refactor/PLAN.md`'s Phase A moves several routes (`/`, `/lists/[id]`, `/privacy`, `/terms`, and others) to static/ISR rendering specifically to reduce Vercel function invocations per `docs/baseline/cost-model.md`'s findings. Update this line as each Phase A step ships rather than leaving it describing a rendering model the code has moved past.

Verified email/password credentials and Google OAuth are the active authentication options. Google users with a verified Google email bypass separate TvSync verification. Apple OAuth is not exposed.

## TMDB Service Notes

Server helpers in `src/lib/services/tmdb/**/index.server.ts` may call TMDB directly through `tmdbServerFetcherCore` or `tmdbServerFetcher`.

Client hooks in `src/lib/services/tmdb/**/index.client.ts` must call `/api/tmdb` through `useTmdbSWR`; never expose `TMDB_API_KEY` to browser code.

The current service layer includes typed helpers for trending movies, trending TV shows, movie details, movie credits, movie recommendations, movie release dates (age certificates), movie reviews, TV show details, TV show credits, TV content ratings (age certificates), TV reviews, TV season details, TV episode details, movie images, person details, and TV search.

Age certificates from both media types normalize to `MediaCertification` and are chosen by `selectPreferredCertification` (`src/lib/services/tmdb/certification.ts`), which prefers the English-speaking boards and otherwise falls back to the first region by name so the choice stays stable between requests.

TV show detail, season detail, and episode detail pages may include current-user progress controls. Keep TMDB reads behind the TMDB service layer and keep progress writes behind server-only tracking actions/helpers.

## Detail Page Layout Notes

Movie and TV show detail pages lead with a compact header: a small poster column (`7.5rem` on mobile, `13rem` from `md`) beside the title, the rating directly under the title, then the fact badges and the genres. Runtime is not one of those badges — no detail page prints a running time. The personal actions follow the header on both pages; on TV shows the episode tracker comes next. Then the `Rating` section, then the description, trailer, director, cast, and TMDB member reviews close both pages.

The personal panel is one row of controls rendered by `MediaDetailActions` (`src/lib/features/library/media-detail-actions.tsx`), not a bordered "Your movie"/"Your TV Show" box and not a status dropdown. A title that is not saved shows a single button — "Add Movie" or "Add TV Show". Once saved it becomes three controls: a heart that turns red for favourites, a "Mark as Finished" toggle that reads "Finished" once set, and an X that removes the title (and its favourite marker) again. Un-finishing returns a movie to `planned` and a show to `watching`, because a show's episode progress is still there. Signed-out visitors see the Login/Register prompt in place of the row.

`Review` is its own section below the actions. `RatingInput` (`src/lib/features/reviews`) accepts a number from 0 to 10 with one decimal place (using either a decimal point or comma), followed by the review textarea. A review still needs a rating to attach to and is limited to 1,000 characters.

`MediaRatingPanel` (`src/lib/components/shared/MediaRating.tsx`) is the shared rating block, and it is deliberately one star and one number: no `/ 10`, no source label, no vote count, no age certificate, and no outbound IMDb link. The number is the genuine IMDb score when `OMDB_API_KEY` is set and OMDb returns one, and the TMDB member score otherwise; because nothing is printed beside it, the accessible name names the source instead, so a TMDB score is still never announced as an IMDb one. The detail routes no longer fetch `/tv/{id}/content_ratings` or `/movie/{id}/release_dates` — nothing renders a certificate — although `selectPreferredCertification` and both endpoint helpers stay in the service layer.

The credited director renders through `MediaCrewSection` (`src/lib/components/shared/MediaCrewSection.tsx`) in the avatar grid the cast section uses, immediately above the cast, instead of as a line of text in the header. Movies take crew members with `job === 'Director'`; TV shows take the same and fall back to `created_by` under a `Creator` heading, because many shows credit no series-level director.

Member reviews come from `/movie/{id}/reviews` and `/tv/{id}/reviews` through the shared contract in `src/lib/services/tmdb/reviews.ts` and render through `MediaReviews`. Only TMDB review permalinks are linked, long reviews expand in place, and an empty list still renders its section. A detail page previews the first six and puts the standard "See All" button on the section title line, opening `/movie/[id]/reviews` or `/tv/show/[id]/reviews`; those routes render the same component with `showAll` and no further action.

`/tv/show/[id]` tracks episodes through `EpisodeTracker` (`src/lib/pages/tv/detail/components/episode-tracker.tsx`), in the shape TV Time made familiar: a left-to-right slider of episode cards for the season being watched — the first season with an unseen episode, or the last season once the show is finished — opened on the next unseen episode, with one "seen" toggle per card. Below it every season is a dropdown that expands in place to its episode titles, each with the same toggle, plus a whole-season toggle and a link to the season page. `getShowSeasonProgress` reads every season's watched episodes in one call and `getSeasonEpisodes` loads a season's episodes on demand, so a show page costs one extra TMDB request per season actually opened. Overall progress is shown once, on the tracker; there is no separate progress summary panel on this page.

## Deployment Notes

Vercel uses `pnpm build` and should load secrets from Vercel environment variables.

- The canonical production origin is `https://tvsync.app`. Keep `AUTH_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, metadata, sitemap/robots output, and the Google OAuth callback (`https://tvsync.app/api/auth/callback/google`) aligned with it.

- Keep API routes and Server Actions lightweight for the free tier.
- Do not rely on always-on background workers.
- Do not add user-uploaded image storage for profile avatars.
- Do not treat `.next` as static export output.

Deployment targets Vercel; `vercel.json` sets the build command.
