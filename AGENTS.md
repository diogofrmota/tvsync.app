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
- Auth: Auth.js/NextAuth with Google OAuth login/register.

## Working Rules

- Do not add major product features until the current architecture is understood and documented.
- Keep route files in `src/app` thin; route UI belongs in `src/lib/pages` and reusable pieces in `src/lib/components`.
- Keep the global app shell and primary navigation in `src/lib/layout`; route links should stay aligned with the shared header navigation.
- Keep TMDB access behind `src/lib/services/tmdb`.
- Do not expose `TMDB_API_KEY` to client code. Client components should use existing SWR hooks that call `/api/tmdb`.
- Add TMDB endpoints as typed server/client helpers under `src/lib/services/tmdb/**`, with endpoint-specific `types.ts` contracts and `utils.ts` normalizers.
- Normalize TMDB response data at the service boundary for nullable posters, backdrops, dates, overviews, credits, seasons, and episodes before page UI consumes it.
- Keep direct database access server-only through `src/lib/services/database/**.server.ts`.
- Use `DATABASE_URL` for pooled Neon runtime access. Use `DATABASE_URL_UNPOOLED` for migration tooling and direct `psql` schema application.
- Do not add database tables until persistence work is explicitly started.
- Keep personal tracking queries behind `src/lib/services/database/tracking.server.ts` or another server-only database helper that verifies the authenticated user id before reading or mutating private rows.
- Login and register pages are intentionally implemented with Google OAuth only. Do not add email/password or reset-password flows until password hashing, email delivery, and database contracts are explicitly designed.
- Do not use object storage for user avatars. Generate profile avatar UI from text data such as initials, display name, color preference, or a small JSON appearance object.
- Keep current-user profile editing in `src/lib/pages/profile` with mutations flowing through server-only actions/helpers and database uniqueness checks.
- Keep shared app domain contracts in `src/lib/types`.
- Place new feature-specific code under the matching `src/lib/features/*` boundary once the feature is ready for implementation.
- Prefer existing Chakra UI patterns and the local theme in `src/lib/styles/theme`.
- Use the `lib/*` import base configured by `tsconfig.json`.
- Avoid broad refactors, dependency churn, or unrelated formatting-only edits.

## Folder Boundaries

- `src/app` - App Router routes, layouts, API route handlers, and route metadata.
- `src/lib/layout` - Global app shell, header/navigation, and footer.
- `src/lib/pages` - Route-level UI composed by App Router pages.
- `src/lib/components` - Shared and domain-specific reusable UI components.
- `src/lib/features` - Feature modules for dashboard, watchlist, and tracking plus future auth, media, profile, reviews, social, and stats modules.
- `src/lib/services/auth` - Server-only Auth.js/NextAuth configuration.
- `src/lib/pages/auth` - Login/register route UI and client auth actions.
- `src/lib/services/database` - Server-only Neon Postgres helpers for Server Components, Server Actions, and Route Handlers.
- `src/lib/services/tmdb` - TMDB clients, endpoint helpers, response types, and TMDB-specific utilities.
- `src/lib/types` - App-level types such as `MediaType`, `WatchStatus`, `RatingValue`, `PrivacySetting`, `UserProfile`, `UserMedia`, and `EpisodeProgress`.
- `src/lib/styles` - Chakra theme and global CSS.
- `src/lib/utils` - Cross-cutting utility functions.
- `database/migrations` - SQL migrations for the Neon Postgres schema.

## Validation

Run these before handing off changes:

```bash
pnpm lint
pnpm type:check
pnpm build
```

Only fix small existing errors that block these checks unless a task explicitly requests broader work.

For final product verification, also smoke-test the public routes (`/`, `/search`, movie detail, TV show detail, season detail, and episode detail) and the authenticated routes with real Google OAuth plus Neon environment variables. Protected flows include profile editing, generated avatar display, watchlist mutations, watch status changes, episode progress, dashboard progress, ratings, reviews, public profiles, social follows when enabled, recommendations, and statistics. Keep this pass focused on stability fixes; do not add major features.

Confirm avatar handling remains storage-free: generated initials/text-based avatar UI only, with no upload paths, file inputs, object storage dependencies, or user-uploaded profile image persistence.

## Database Notes

The initial tracking schema is in `database/migrations/0001_initial_tracking_schema.sql` and creates `profiles`, `user_media`, `episode_progress`, `ratings`, `reviews`, and `watchlist_items`.

- Apply migrations with `DATABASE_URL_UNPOOLED`; use pooled `DATABASE_URL` only for runtime app queries.
- Duplicate user/media records are guarded by database unique constraints.
- Common owner, media, status, public-read, and date ordering lookups should have matching indexes before related UI or API work ships.
- Watchlist mutations should use the existing server-only watchlist actions/helpers and rely on the `(user_id, tmdb_id, media_type)` unique constraint to prevent duplicates.
- Watch status mutations should use `src/lib/features/tracking` Server Actions and `src/lib/services/database/tracking.server.ts`. Movies support `planned` and `watched`; TV shows support `planned`, `watching`, `completed`, `dropped`, and `paused`.
- Episode progress mutations should stay server-only through the tracking helpers and the `episode_progress` unique `(user_id, tmdb_show_id, season_number, episode_number)` constraint. TV progress summaries should derive watched counts, percentage, next episode, watched seasons, and last watched date from Neon plus normalized TMDB season data.
- Row-level security is not enabled yet. Authorization is enforced in the application/query layer by deriving `session.user.id` from NextAuth and scoping personal reads/mutations to that id.
- Users may only modify their own personal tracking rows. Public profile/review reads must honor `privacy_setting = 'public'` where practical.
- If RLS is added later, document exactly how the app sets transaction-local Neon context, such as `set_config('app.current_user_id', userId, true)`, and keep server-side query authorization checks as defense in depth.

## Navigation Notes

Primary navigation currently lives in `src/lib/layout/Header.tsx` and is centered on desktop. Signed-out users see Home, Movies, TV Shows, and Login / Register. Signed-in users see Home, Movies, TV Shows, Watchlist, and Profile.

- Use `/movies/popular` as the main Movies link.
- Use `/tv/popular` as the main TV Shows link.
- Keep `/watchlist` auth-protected. It should load saved rows from Neon, hydrate items with TMDB details, separate movies from TV shows, support local search/filter/sort, and remove items through server-only actions.
- Watchlist items should show and update the current user's saved watch status where available.
- Keep `/profile` auth-protected. It should follow the left-aligned route title/subtitle page pattern. Current-user profile editing should save name, username, display name, bio, and privacy setting to Neon through server-only code; Google email remains auth-owned unless the auth design changes.
- Maintain both desktop active-route styling and the mobile bottom navigation when adding or changing primary routes.
- Keep the signed-out Home page discovery-focused: title/subtitle hero, trending TV shows, trending movies, and a 16-title weekly popular mix are appropriate. Do not add a quick-search block to the home hero.
- Keep the signed-in Home page personalized through `src/lib/features/dashboard`: first-name welcome, watchlist preview, upcoming episodes, friend activity, and the shared discovery shelves. Combine current-user Neon tracking/watchlist rows with TMDB details, cap hydrated items for serverless efficiency, and use existing Server Actions for watchlist mutations.
- Keep the public Search page discovery-focused: use TMDB multi-search for movies and TV shows, support debounced title search and All/Movies/TV Shows filters, link results to detail pages, and send logged-out users to login before saving watchlist items.

## Environment Notes

Required:

- `TMDB_API_KEY`
- `DATABASE_URL` before using Neon-backed features.
- `AUTH_SECRET` before production auth sessions are enabled.

Optional:

- `TMDB_API_URL`
- `DATABASE_URL_UNPOOLED` for migration tooling.
- `AUTH_URL`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_SRC`

`TMDB_API_KEY` is required at build time because some App Router pages prerender TMDB-backed content.

Google OAuth is the active auth option. Apple OAuth is a prepared future UI affordance only, and email/password plus reset-password flows are intentionally absent until the auth layer supports them.

## TMDB Service Notes

Server helpers in `src/lib/services/tmdb/**/index.server.ts` may call TMDB directly through `tmdbServerFetcherCore` or `tmdbServerFetcher`.

Client hooks in `src/lib/services/tmdb/**/index.client.ts` must call `/api/tmdb` through `useTmdbSWR`; never expose `TMDB_API_KEY` to browser code.

The current service layer includes typed helpers for trending movies, trending TV shows, weekly all-media trending, movie details, movie credits, movie recommendations, TV show details, TV show credits, TV season details, TV episode details, movie images, person details, TV search, and multi-search.

TV show detail, season detail, and episode detail pages may include current-user progress controls. Keep TMDB reads behind the TMDB service layer and keep progress writes behind server-only tracking actions/helpers.

## Deployment Notes

Vercel uses `pnpm build` and should load secrets from Vercel environment variables.

- The canonical production origin is `https://tvsync.app`. Keep `AUTH_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, metadata, sitemap/robots output, and the Google OAuth callback (`https://tvsync.app/api/auth/callback/google`) aligned with it.

- Keep API routes and Server Actions lightweight for the free tier.
- Do not rely on always-on background workers.
- Do not add user-uploaded image storage for profile avatars.
- Do not treat `.next` as static export output.

The existing `netlify.toml` is retained for historical compatibility, but new deployment work should target Vercel.
