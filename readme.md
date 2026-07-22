# TVSync

TVSync is a Next.js App Router application for discovering movies and TV shows with TMDB data.

Repository: https://github.com/diogofrmota/tvsync.app

## Current Stack

- Framework: Next.js App Router
- Language: TypeScript
- UI: Chakra UI 3
- Data fetching: TMDB, proxied through server-side helpers and `/api/tmdb`
- Client cache: SWR
- HTTP client: `ky`
- Tooling: pnpm, Biome, TypeScript, Turbo, Husky
- Deployment target: Vercel free tier
- Database: Neon Postgres through Vercel Marketplace
- Auth: Auth.js/NextAuth with verified email/password credentials and Google OAuth

## Project Structure

- `src/app` - App Router routes, layout, 404, and the TMDB proxy route.
- `src/lib/pages` - Route-level page UI for home, movie, TV, person, search, and 404 screens.
- `src/lib/features` - Feature boundaries for dashboard data loading, watchlist and tracking actions, plus reserved auth, media, profile, reviews, social, and stats work.
- `src/lib/components` - Reusable Chakra UI components, movie/TV cards, sliders, list containers, and shared presentation helpers.
- `src/lib/services/tmdb` - TMDB service layer split into server helpers, client SWR hooks, endpoint constants, and response types.
- `src/lib/services/database` - Server-only Neon Postgres helpers for Server Components, Server Actions, and Route Handlers.
- `src/lib/services/auth` - Server-only Auth.js/NextAuth configuration.
- `src/lib/pages/auth` - Route-level login/register UI and auth client actions.
- `src/lib/pages/profile` - Route-level current-user profile UI, edit form, and profile Server Action.
- `src/lib/types` - Shared app-level domain types such as media types, watch status, privacy settings, user profiles, user media, and episode progress.
- `src/lib/layout` - Global header, footer, and app shell.
- `src/lib/styles` - Global CSS and Chakra theme setup.
- `src/lib/utils` - Shared utilities such as `fetcher`, route back handling, tracking, formatting, and age calculation.
- `database/migrations` - SQL migrations for the Neon Postgres schema.
- `public` - Static assets, manifest, TMDB logo, popcorn icon, and illustration assets.

## Architecture Notes

- Keep App Router files in `src/app` focused on routing, metadata, and data handoff.
- Put route-level UI in `src/lib/pages` and reusable UI in `src/lib/components`.
- Keep the global app shell and navigation in `src/lib/layout`; add route UI elsewhere and link to it from the shared nav.
- Keep TMDB integration behind `src/lib/services/tmdb`; browser code should go through existing SWR hooks or `/api/tmdb`.
- Use `src/lib/types` for shared app domain contracts before adding persistence-backed features.
- Add feature implementation under the matching `src/lib/features/*` folder when the feature has enough shape to justify local modules.
- Keep direct database access server-only through `src/lib/services/database/**.server.ts`; client components must call route handlers or Server Actions.
- Use `DATABASE_URL` for pooled Neon runtime queries. Use `DATABASE_URL_UNPOOLED` for migration tooling.
- Profile data should stay text-based in Postgres. Do not add object storage for user avatars; generate avatar UI from initials, display name, color preference, or a small JSON appearance object.

## Database Schema

The Neon Postgres schema lives in `database/migrations` and should be applied in numeric order.

It creates `profiles`, `user_media`, `episode_progress`, `ratings`, `reviews`, and `watchlist_items`. Duplicate personal records are prevented with unique constraints on user/media keys, including `(user_id, tmdb_id, media_type)` and `(user_id, tmdb_show_id, season_number, episode_number)`. Lookup indexes cover owner lookups, TMDB media lookups, status filters, public review reads, and date-added ordering.

`user_media.watch_status` is media-type aware. Movies support `planned` and `watched`; TV shows support `planned`, `watching`, `completed`, `dropped`, and `paused`. The shared `WatchStatus` contracts in `src/lib/types` are the source of truth for UI controls and Server Actions.

`database/migrations/0002_watch_status_values.sql` updates existing databases from the previous generic status constraint to the media-specific constraint and migrates old `on_hold` values to `paused`.

Runtime database access stays server-only through `src/lib/services/database`. Personal tracking queries should use `src/lib/services/database/tracking.server.ts`, which reads the authenticated NextAuth session, derives `session.user.id`, and scopes mutations to the current user id. Public reads are intentionally narrow: public profiles and public reviews only return rows where privacy settings allow it.

Row-level security is not enabled in the initial migration. Authorization is enforced in the application/query layer so future Server Actions and Route Handlers must call the tracking helpers instead of querying these tables directly. If RLS is introduced later, document the transaction-local user context setup, for example `set_config('app.current_user_id', userId, true)`, and keep the app-layer checks as defense in depth.

### Applying Migrations

For local development, make sure `.env.local` contains `DATABASE_URL_UNPOOLED` for migration work, then run:

```bash
pnpm db:migrate
```

The migration runner creates a `schema_migrations` table and skips migrations it has already applied. If a database was migrated manually before migration history existed, verify the schema first, then record the existing SQL files without rerunning them:

```bash
pnpm db:migrate:record-existing
```

On Neon, open the project created through the Vercel Marketplace, go to the SQL editor, paste the migrations in numeric order, and run them against the target branch. Keep `DATABASE_URL` configured in Vercel for pooled runtime access and `DATABASE_URL_UNPOOLED` available only where migration tooling needs it.

## TMDB Service Layer

TMDB access is split by runtime:

- Server helpers live in `src/lib/services/tmdb/**/index.server.ts` and call TMDB with `TMDB_API_KEY`.
- Client hooks live in `src/lib/services/tmdb/**/index.client.ts` and call the local `/api/tmdb` proxy.
- Endpoint response contracts live beside each endpoint in `types.ts`.
- Endpoint normalizers live beside each endpoint in `utils.ts` and defensively normalize missing posters, backdrops, dates, overviews, credits, seasons, and episodes.

Current typed TMDB helpers cover movie lists, true similar movies, movie videos, regional movie watch providers, trending movies, trending TV shows, weekly all-media trending, movie details, movie credits, TV show details, TV show credits, TV season details, TV episode details, movie images, person details, TV search, and multi-search. The search route consumes its client helpers through `/api/tmdb`; movie details consume server-only helpers and never expose the TMDB key.

Do not pass `TMDB_API_KEY` into client components or `NEXT_PUBLIC_*` variables. Add new TMDB endpoints by creating typed server/client helpers under `src/lib/services/tmdb`, then normalize raw TMDB JSON at that boundary before route-level UI consumes it.

## Authentication

Authentication is implemented with NextAuth v4 JWT sessions, a credentials provider, Google OAuth, Neon persistence, and Resend delivery. The active auth routes are:

- `/login` - Email-or-username/password login, verification resend, Google login, and safe callback redirects.
- `/register` - Email/username/password registration with verification plus Google registration.
- `/forgot-password` - Non-enumerating password-reset request.
- `/reset-password?token=...` - One-time 24-hour password reset.
- `/verify-email?token=...` - One-time email verification.
- `/api/auth/[...nextauth]` - NextAuth route handler.

`database/migrations/0005_auth_lifecycle.sql` adds explicit credentials/Google account mappings, bcrypt password hashes, verified-email state, digest-only one-time tokens, JWT session-version revocation, and persistent rate-limit counters. Raw verification/reset tokens and plaintext passwords are never stored. Credential sessions are refused until `email_verified_at` is set; Google linking requires Google's verified-email claim and uses the stable Google subject as the provider identifier.

Resend is initialized lazily on the server and uses absolute environment-aware links. Configure `RESEND_API_KEY` and a verified `AUTH_EMAIL_FROM` sender. Forgot-password and verification-resend responses are generic, rate limited by both identity and IP digests, and use a minimum timing envelope to reduce account-enumeration signals.

Successful sign-in uses JWT sessions backed by an internal `profiles.user_id`. `/profile` and `/watchlist` are protected server-side and redirect signed-out users to `/login` with a normalized same-origin callback URL. A password reset increments `profiles.session_version`, invalidating existing JWT sessions on their next check.

`pnpm test` includes an isolated PGlite PostgreSQL suite that applies migrations 0001-0005 and executes the same parameterized lifecycle queries used by Neon. It covers normalized identity constraints, credentials lookup, Google subject mapping, verification and reset token expiry/single-use behavior, password hash replacement, session rotation, and persistent throttling without requiring a developer database.

The protected `/profile` route lets the current user edit their text profile. It saves name, username, display name, bio, and privacy setting through a server-only action, keeps Google email read-only, validates usernames as 3-24 lowercase letters/numbers/underscores, and relies on the lowercased unique username index to prevent duplicates. If an authenticated user reaches `/profile` without an existing profile row, the page acts as a first-login setup form using session-derived defaults.

## Watchlist

Signed-in users can save movies and TV shows from search results, movie detail pages, and TV show detail pages. Mutations go through server-only watchlist actions in `src/lib/features/watchlist`, which use `src/lib/services/database/tracking.server.ts` and the `watchlist_items` unique `(user_id, tmdb_id, media_type)` constraint to prevent duplicates. Signed-out users who try to save are sent to `/login` with the current page as the callback URL.

The protected `/watchlist` route loads saved rows from Neon, hydrates each item with TMDB movie or TV details, separates saved movies from saved TV shows, shows the current saved status from `user_media`, and supports local filtering, title search, sorting by date added, release date, rating, and title, direct removal, and links back to each media detail page.

## Tracking

Signed-in users can classify movies as planned or watched from movie detail pages and the watchlist. TV shows can be planned, watching, completed, dropped, or paused from TV detail pages and the watchlist. Status mutations go through `src/lib/features/tracking` Server Actions and are persisted to Neon through `src/lib/services/database/tracking.server.ts`. Signed-out users are redirected to login before a status change is saved.

TV episode progress is stored in `episode_progress`. Episode detail pages and season episode lists can mark individual episodes watched or unwatched, and season pages can mark the entire season watched or unwatched. TV show detail pages summarize watched episode count, total progress percentage, next episode, watched seasons, and last watched date from Neon plus TMDB season data.

## Dashboard

The `/` route is public but personalized when a user is signed in. Signed-out visitors see a title/subtitle hero, trending TV shows, trending movies, and a 16-title weekly popular mix. Signed-in users see a first-name welcome, Watchlist Preview, Upcoming Episodes, Friend Activity, and then the shared discovery shelves.

Dashboard data loading lives in `src/lib/features/dashboard`. It keeps private Neon reads server-only, limits TMDB hydration to upcoming tracked shows and a small set of watchlist rows, and uses existing watchlist Server Actions for quick saved-title mutations.

## Routes

- `/` - Public discovery home page for signed-out visitors and a personalized dashboard for signed-in users with Watchlist Preview, Upcoming Episodes, Friend Activity, trending TV shows, trending movies, and weekly popular titles.
- `/search` - Discovery search for movies and TV shows using TMDB multi-search, with debounced search input, All/Movies/TV Shows filters, linked results, watchlist save actions, and empty/error states.
- `/movies/popular` - Main movie navigation target with search, Most Popular Movies, Trending Movies, and Highest Rated Movies of All Time sections.
- `/movies/[section]` - Movie lists such as popular, top rated, upcoming, or now playing.
- `/movies/genre/[genre]` - Movie discovery by genre.
- `/movies/search` - Movie search list view.
- `/movie/[id]` - Movie detail page with poster, backdrop, overview, release data, genres, director, cast, TMDB rating, runtime, recommended movies, watchlist add/remove state, and current-user watch status.
- `/movie/[id]/images` - Movie image gallery.
- `/tv/popular` - Main TV show navigation target with search, Most Popular TV Shows, Trending TV Shows, and Highest Rated TV Shows of All Time sections.
- `/tv/[listType]` - TV show lists.
- `/tv/show/[id]` - TV show detail page with poster, backdrop, overview, genres, first air date, status, season and episode counts, TMDB rating, cast, linked seasons, watchlist add/remove state, current-user watch status, and TV progress summary.
- `/tv/show/[id]/season/[seasonNumber]` - TMDB season detail page with season metadata, episodes, per-episode watched/unwatched controls, and season-wide watched/unwatched actions.
- `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]` - TMDB episode detail page with watched/unwatched progress action.
- `/login` - Public email-or-username/password and Google login page.
- `/register` - Public credentials or Google registration page.
- `/forgot-password` - Public generic reset-email request page.
- `/reset-password` - Public one-time token password reset page.
- `/verify-email` - Public one-time token email verification page.
- `/watchlist` - Auth-protected watchlist page with separated Neon-backed saved movie and TV show sections, TMDB hydration, local search, filtering, sorting, detail links, and direct removal.
- `/profile` - Auth-protected current-user profile page with a left-aligned title/subtitle, generated initials avatar, editable text fields, username validation, duplicate username protection, privacy settings, and logout.
- `/person/[id]` - Person detail page.
- `/api/tmdb/[[...path]]` - Server-side proxy to TMDB, keeping the TMDB API key out of client code.
- `/api/auth/[...nextauth]` - NextAuth route handler.

## Navigation

The shared header in `src/lib/layout/Header.tsx` exposes the primary navigation:

- Home: `/`
- Movies: `/movies/popular`
- TV Shows: `/tv/popular`
- Watchlist: `/watchlist`
- Profile: `/profile`

Desktop navigation is centered in the header with active-route styling. Mobile navigation uses a fixed bottom bar with the same route list. Signed-out users see Home, Movies, TV Shows, and Login / Register. Signed-in users see Home, Movies, TV Shows, Watchlist, and Profile, plus a desktop logout action.

## Environment Variables

Use `.env.example` as the local environment template.

```bash
TMDB_API_URL=https://api.themoviedb.org/3
TMDB_API_KEY=your_tmdb_api_key
TMDB_WATCH_REGION=US
DATABASE_URL=postgres://user:password@host/database?sslmode=require
DATABASE_URL_UNPOOLED=postgres://user:password@host/database?sslmode=require
AUTH_SECRET=generate_a_strong_auth_secret
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
AUTH_EMAIL_FROM=
AUTH_EMAIL_REPLY_TO=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_UMAMI_SRC=
```

- `TMDB_API_KEY` is required for server-side TMDB requests and for build-time prerendered pages that fetch TMDB data.
- `TMDB_API_URL` is optional and defaults to `https://api.themoviedb.org/3`.
- `TMDB_WATCH_REGION` is an optional ISO 3166-1 country code used for movie streaming availability and defaults to `US`.
- `DATABASE_URL` is required before using Neon-backed Server Components, Server Actions, or Route Handlers.
- `DATABASE_URL_UNPOOLED` is used by migration tooling and direct `psql` schema application.
- `AUTH_SECRET` is required for production auth sessions. Generate a strong value and store it only in local/Vercel environment variables.
- `AUTH_URL` and `NEXTAUTH_URL` should be `http://localhost:3000` locally and `https://tvsync.app` in the Vercel production environment. `NEXTAUTH_URL` is required by NextAuth v4 in many deployments.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required for Google OAuth login/register. Without them, the auth pages render a configuration warning and disable Google sign-in.
- `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are required for verification and password-reset delivery. Use a Resend-verified sender domain in production. `AUTH_EMAIL_REPLY_TO` is optional.
- `NEXT_PUBLIC_SITE_URL` controls the canonical sitemap origin. Set it to `http://localhost:3000` locally and `https://tvsync.app` in production.
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and `NEXT_PUBLIC_UMAMI_SRC` are optional. When both are set, the app loads the Umami tracker script and existing UI events are sent through `src/lib/utils/track-event.ts`.

For local development, create `.env.local` from `.env.example` and fill in the TMDB key. Add Neon and Google OAuth values before using authenticated or persistence-backed routes.

## Scripts

```bash
pnpm dev
pnpm test
pnpm lint
pnpm type:check
pnpm build
pnpm start
pnpm build:turbo
pnpm check:turbo
pnpm db:migrate
pnpm db:migrate:record-existing
pnpm ultracite:check
pnpm ultracite:fix
pnpm biome:ci
pnpm release
pnpm push-release
```

The main validation path is:

```bash
pnpm test
pnpm lint
pnpm type:check
pnpm build
```

## Final Verification

Before deployment handoff, verify the public discovery flows, TMDB detail pages, and authenticated Neon-backed flows together:

- Public: `/`, `/search`, `/movie/[id]`, `/tv/show/[id]`, `/tv/show/[id]/season/[seasonNumber]`, and `/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]`.
- Authenticated with Google OAuth and Neon configured: register/login, profile text editing, generated avatar display, watchlist add/remove, watch status updates, episode progress, dashboard progress, ratings, reviews, public profiles, social follows when enabled, recommendations, and statistics.
- Runtime checks: watch the dev server/browser console for Next.js overlays, unsupported dynamic route links, missing environment variables, and failed TMDB/Neon calls.
- Deployment checks: run `pnpm lint`, `pnpm type:check`, and `pnpm build` with `TMDB_API_KEY` available; confirm Vercel has pooled `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, and Google OAuth secrets before testing protected flows.

Avatar verification should confirm the app still uses generated Chakra avatars from text/profile data only. There should be no avatar upload route, file input, object storage bucket, Blob/S3/Cloudinary dependency, or user-uploaded profile image path.

## Getting Started

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

Fill `.env.local` before running production-like builds. `TMDB_API_KEY` is required at build time because some App Router pages prerender TMDB-backed content.

### TMDB Setup

Create an API key in the TMDB developer settings and set `TMDB_API_KEY` in `.env.local` and Vercel. `TMDB_API_URL` can stay as `https://api.themoviedb.org/3` unless TMDB changes its base URL.

### Neon Postgres Setup

Provision Neon Postgres through the Vercel Marketplace for the deployment project. Use the pooled Neon connection string as `DATABASE_URL` for serverless runtime queries. Use the unpooled/direct connection string as `DATABASE_URL_UNPOOLED` for migration tooling or direct `psql` schema application.

Apply migrations in numeric order from `database/migrations`. Use `DATABASE_URL_UNPOOLED` for these commands, not the pooled runtime URL. For the local migration runner:

```bash
pnpm db:migrate
```

### Auth Setup

Create Google OAuth credentials in Google Cloud Console. Add `http://localhost:3000/api/auth/callback/google` for local development and `https://tvsync.app/api/auth/callback/google` for production. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_URL`, and `NEXTAUTH_URL` in the matching local and Vercel environments.

Apply `database/migrations/0005_auth_lifecycle.sql` before testing credentials. Login and registration support verified email/password accounts and Google OAuth; credential accounts remain inaccessible until their verification link is consumed.

## Deployment

The project is prepared for Vercel free tier deployment.

- Build command: `pnpm build`
- Install command: `pnpm install --frozen-lockfile`
- Framework preset: Next.js
- Root directory: repository root
- Node version: `24`
- Database: Vercel-managed Neon Postgres store `tvsync-db`
- Required Vercel environment variables: `TMDB_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`.
- Optional Vercel environment variables: `TMDB_API_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_URL`, `AUTH_EMAIL_REPLY_TO`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, and `NEXT_PUBLIC_UMAMI_SRC`.
- Migration-only variable: keep `DATABASE_URL_UNPOOLED` separate from pooled runtime access and use it only for migration tooling/direct `psql` work.
- Confirm `DATABASE_URL` is the pooled Neon string in Vercel so runtime Server Components, Server Actions, and Route Handlers stay serverless-friendly.
- Set `AUTH_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_SITE_URL` to `https://tvsync.app` in the production environment.
- Confirm the Google OAuth authorized redirect URI is `https://tvsync.app/api/auth/callback/google` before switching traffic to production.

Vercel free tier constraints for this app:

- Do not use object storage for user-uploaded profile images.
- Profile avatars are generated from text data such as initials/display names; there is no user-uploaded avatar storage.
- Do not rely on always-on background workers.
- Keep API routes and Server Actions lightweight.
- Store secrets only in Vercel environment variables, not in client code or committed files.

The existing `netlify.toml` remains in the repository for historical Netlify compatibility, but new deployment work should target Vercel.

## Roadmap

See `ROADMAP.md` for the short internal implementation roadmap and current architecture notes.

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Chakra UI](https://chakra-ui.com)
- [TMDB API](https://developer.themoviedb.org/docs)
- [TypeScript](https://typescriptlang.org)
