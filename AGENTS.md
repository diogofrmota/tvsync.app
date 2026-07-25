# AGENTS.md

Guidance for AI agents and contributors working in this repository.

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

- Do not add major product features until the current architecture is understood and documented.
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
- Do not use object storage for user avatars. Generate profile avatar UI from text data such as initials, display name, color preference, or a small JSON appearance object.
- Keep current-user profile editing in `src/lib/pages/profile` with mutations flowing through server-only actions/helpers and database uniqueness checks.
- Keep shared app domain contracts in `src/lib/types`.
- Place new feature-specific code under the matching `src/lib/features/*` boundary once the feature is ready for implementation.
- Prefer existing Chakra UI patterns and the local theme in `src/lib/styles/theme`.
- Chakra UI 3 ships its components as client components, so a Server Component must never hand one of them a component as a prop (`as={SomeIcon}`, `icon={...}`). React cannot serialize a function across that boundary and the whole route falls back to the error page. Render the icon as a child of a styled element instead — see `src/lib/components/shared/FavoriteHeart.tsx` — or mark the wrapper `'use client'`. `tests/server-component-boundaries.test.ts` guards this.
- Use the `lib/*` import base configured by `tsconfig.json`.
- Avoid broad refactors, dependency churn, or unrelated formatting-only edits.

## Folder Boundaries

- `src/app` - App Router routes, layouts, API route handlers, and route metadata.
- `src/lib/layout` - Global app shell, header/navigation, and footer.
- `src/lib/pages` - Route-level UI composed by App Router pages.
- `src/lib/components` - Shared and domain-specific reusable UI components.
- `src/lib/features` - Feature modules: `auth`, `contact`, `library`, `profile`, `reviews` (personal ratings), `social` (follow graph), `tracking`, and `watchlist`.
- `src/lib/services/auth` - Server-only Auth.js/NextAuth configuration.
- `src/lib/pages/auth` - Login/register route UI and client auth actions.
- `src/lib/services/database` - Server-only Neon Postgres helpers for Server Components, Server Actions, and Route Handlers.
- `src/lib/services/tmdb` - TMDB clients, endpoint helpers, response types, and TMDB-specific utilities.
- `src/lib/services/omdb` - Server-only OMDb client for genuine IMDb rating values.
- `src/lib/types` - App-level types such as `MediaType`, `WatchStatus`, `RatingValue`, `PrivacySetting`, `UserProfile`, `UserMedia`, and `EpisodeProgress`.
- `src/lib/styles` - Chakra theme and global CSS.
- `src/lib/utils` - Cross-cutting utility functions.
- `database/migrations` - SQL migrations for the Neon Postgres schema.

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

Confirm avatar handling remains storage-free: generated initials/text-based avatar UI only, with no upload paths, file inputs, object storage dependencies, or user-uploaded profile image persistence.

## Database Notes

The initial tracking schema is in `database/migrations/0001_initial_tracking_schema.sql` and creates `profiles`, `user_media`, `episode_progress`, `ratings`, and `watchlist_items`.

The authentication lifecycle schema is in `database/migrations/0005_auth_lifecycle.sql`. It adds provider mappings, verified-email/session-version state, one-time verification/reset token digests, and persistent authentication rate-limit counters.

Personalized lists were removed from the product. `database/migrations/0010_personalized_lists.sql` stays in the migration history so applied databases keep matching the recorded migrations, but `custom_lists` and `custom_list_items` are no longer read or written by the app. Do not add UI, routes, or helpers back on top of those tables.

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

## Navigation Notes

Primary navigation currently lives in `src/lib/layout/Header.tsx` and is centered on desktop. Signed-out users see Home, Register, and Login. Signed-in users see Movies, TV Shows, Search, and Profile.

- Use `/movies` as the authenticated Movies library link and `/tv-shows` as the authenticated TV Shows library link. Public discovery lists remain available through their existing deep routes.
- Use `/explore` (labeled "Explore") as the authenticated search/browse link.
- Keep the legacy `/watchlist` route auth-protected while library behavior migrates to the Movies and TV Shows routes; do not restore it to primary navigation.
- Watchlist items should show and update the current user's saved watch status where available.
- Keep `/profile` auth-protected. It opens with the shared route title pattern like every other page: the `Profile` heading first. Below it, a centred identity block holds the display name plus `@username`, follow-count chips linking to `/following` and `/followers`, the biography when present, and finally the Edit Profile and Log out actions, centred under the biography. The own-profile page shows no avatar of any kind. Current-user profile editing should save name, username, display name, bio, and privacy setting to Neon through server-only code; Google email remains auth-owned unless the auth design changes.
- Maintain both desktop active-route styling and the mobile bottom navigation when adding or changing primary routes.
- Keep the signed-out Home page discovery-focused: title/subtitle hero, trending TV shows, trending movies, and a 16-title weekly popular mix are appropriate. Do not add a quick-search block to the home hero.
- Signed-in users are redirected from `/` to `/movies`; there is no separate personalized home/dashboard. Keep the root route (`src/lib/pages/home`) as the signed-out discovery experience.
- Render the `/explore` featured area as the `ExploreHero` slideshow: up to `EXPLORE_HERO_SLIDE_COUNT` (10) trending titles that advance automatically every five seconds and can also be moved with the arrows or slide dots. Every slide shows the poster, the title, a star with the genuine IMDb rating (falling back to the clearly labeled TMDB score), a trailer link built from the trusted YouTube trailer selectors, and a link to the detail page. Slide data is shaped server-side in `src/lib/pages/explore/hero-slides.server.ts`; missing trailers or IMDb ratings degrade to omitted extras instead of blanking the slideshow.
- Home and `/explore` render one shared set of discovery rails. The rail keys, names, and page selections live in `src/lib/pages/media/discovery-rails.ts`; the cached TMDB reads and "See All" targets live in `src/lib/pages/media/discovery-rails.server.ts`. A page picks rails by key and never queries a list of its own, so a section both pages show carries the same name and the same titles. Explore additionally reads `loadTrendingDiscoveryResults` for its featured slideshow, which is the same cached trending response its trending rails use.
- Keep the `/explore` page discovery-focused: the featured hero plus the trending, upcoming, popular, and highest-rated rails. There is no "Recommended for you" rail and no genre browser. A `?query=` term replaces the landing with `src/lib/pages/search/results`: one grid of the movies and TV shows related to the term, merged and ordered by TMDB popularity, with no content-type tabs, genre filter, sort control, or pagination. Logged-out visitors are sent to login before saving library items.
- Render every list preview (signed-out Home, `/explore`, the Movies/TV overviews, and every `/profile` section) with the shared horizontally scrollable rail in `src/lib/components/shared/MediaRail.tsx`. Keep the preview size in `MEDIA_RAIL_ITEM_LIMIT` (20 posters) instead of restating it per page, and do not reintroduce a page-specific poster grid preview. The rail shows posters only: "See All" is the single action on the section title line, never repeated as a tile at the end of the rail. One TMDB page is 20 titles, so a rail is one request per section — a rail that comes back short renders the titles it has instead of spending extra calls against the shared API budget.
- Keep `/profile` sections in this order: Statistics (only TV Shows Watched and Movies Watched, with "See All" opening `/profile/statistics`), TV Shows, Favourite TV Shows, Movies, Favourite Movies. Favourite sections put the title first and the marker after it: pass `titleIcon={<FavoriteHeartIcon />}` (`src/lib/components/shared/FavoriteHeart.tsx`) to the rail or page heading instead of prefixing the title with a heart emoji. Every section is a `MediaRail` with a "See All" target; the complete lists live at `/tv-shows`, `/movies`, and `/profile/favorites/[mediaType]`.
- Keep the poster quick actions in `src/lib/features/library/media-quick-actions.tsx` and render them from `PosterCard` only; every movie/TV item shows the yellow plus (add to library), then the "Added" chip plus the heart that turns red for favourites.
- Library chips are for discovery surfaces only. Pass `libraryBadges={false}` from the user's own library surfaces (`/movies`, `/tv-shows`, `/profile`, and `/profile/favorites/[mediaType]`) so neither the "Added" chip nor a Watching/Planned to Watch/Finished label is repeated on titles the user already knows are saved. `/explore`, the discovery lists, and other users' profiles keep the chips.
- Show watch progress on the artwork instead of in text: `PosterCard` draws a bar across the bottom of the poster that fills in `gold.400` while a title is in progress and turns `green.400` at full width once it is finished. A title that has not been started renders no bar, and no page prints a watched percentage or an episode counter under a poster.
- Load the signed-in user's library/favourite snapshot once per page through `MediaLibraryProvider` (`src/lib/features/library/media-library-provider.tsx`). Surfaces that show library state (poster quick actions, search status selects) read and write that context instead of keeping their own copy.
- Keep the "See All" list routes (`/movies/[section]`, `/movies/genre/[genre]`, `/tv/[listType]`) server-rendered through `src/lib/pages/media/media-list.server.tsx`: one complete list of up to 30 titles in a single grid, with no page navigation. `/explore` search results are a single unpaginated grid as well.

## Environment Notes

Required:

- `TMDB_API_KEY`
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

`TMDB_API_KEY` is required at runtime for discovery and detail content. All App Router routes render dynamically (no `generateStaticParams`), so the build itself does not call TMDB.

Verified email/password credentials and Google OAuth are the active authentication options. Google users with a verified Google email bypass separate TvSync verification. Apple OAuth is not exposed.

## TMDB Service Notes

Server helpers in `src/lib/services/tmdb/**/index.server.ts` may call TMDB directly through `tmdbServerFetcherCore` or `tmdbServerFetcher`.

Client hooks in `src/lib/services/tmdb/**/index.client.ts` must call `/api/tmdb` through `useTmdbSWR`; never expose `TMDB_API_KEY` to browser code.

The current service layer includes typed helpers for trending movies, trending TV shows, movie details, movie credits, movie recommendations, movie release dates (age certificates), movie reviews, TV show details, TV show credits, TV content ratings (age certificates), TV reviews, TV season details, TV episode details, movie images, person details, and TV search.

Age certificates from both media types normalize to `MediaCertification` and are chosen by `selectPreferredCertification` (`src/lib/services/tmdb/certification.ts`), which prefers the English-speaking boards and otherwise falls back to the first region by name so the choice stays stable between requests.

TV show detail, season detail, and episode detail pages may include current-user progress controls. Keep TMDB reads behind the TMDB service layer and keep progress writes behind server-only tracking actions/helpers.

## Detail Page Layout Notes

Movie and TV show detail pages lead with a compact header: a small poster column (`7.5rem` on mobile, `13rem` from `md`) beside the title, the fact badges, the genres, and the rating panel. On TV shows the episode tracker comes next, then the "Your TV show" panel; on movies the "Your movie" panel follows the header directly. The description, trailer, cast, and TMDB member reviews close both pages.

`MediaRatingPanel` (`src/lib/components/shared/MediaRating.tsx`) is the shared rating block. IMDb values need `OMDB_API_KEY` and are usually unavailable, so the panel leads with the TMDB member score, always labelled `TMDB`, beside the age certificate from `/tv/{id}/content_ratings` and `/movie/{id}/release_dates`. A genuine IMDb score is appended only when OMDb returns one, and a TMDB score is never labelled as an IMDb score.

Member reviews come from `/movie/{id}/reviews` and `/tv/{id}/reviews` through the shared contract in `src/lib/services/tmdb/reviews.ts` and render through `MediaReviews`. Only TMDB review permalinks are linked, long reviews expand in place, and an empty list still renders its section.

`/tv/show/[id]` tracks episodes through `EpisodeTracker` (`src/lib/pages/tv/detail/components/episode-tracker.tsx`), in the shape TV Time made familiar: a left-to-right slider of episode cards for the season being watched — the first season with an unseen episode, or the last season once the show is finished — opened on the next unseen episode, with one "seen" toggle per card. Below it every season is a dropdown that expands in place to its episode titles, each with the same toggle, plus a whole-season toggle and a link to the season page. `getShowSeasonProgress` reads every season's watched episodes in one call and `getSeasonEpisodes` loads a season's episodes on demand, so a show page costs one extra TMDB request per season actually opened. Overall progress is shown once, on the tracker; there is no separate progress summary panel on this page.

## Deployment Notes

Vercel uses `pnpm build` and should load secrets from Vercel environment variables.

- The canonical production origin is `https://tvsync.app`. Keep `AUTH_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, metadata, sitemap/robots output, and the Google OAuth callback (`https://tvsync.app/api/auth/callback/google`) aligned with it.

- Keep API routes and Server Actions lightweight for the free tier.
- Do not rely on always-on background workers.
- Do not add user-uploaded image storage for profile avatars.
- Do not treat `.next` as static export output.

Deployment targets Vercel; `vercel.json` sets the build command.
