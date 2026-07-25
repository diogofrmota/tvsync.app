/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the cache requirement they guard. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { parsePositiveIntegerRouteParam } from '../src/lib/utils/route-params';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const listSourceFiles = (directory: string): Array<string> =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });

const highCardinalityRoutes = [
  'src/app/movie/[id]/page.tsx',
  'src/app/movie/[id]/images/page.tsx',
  'src/app/tv/show/[id]/page.tsx',
  'src/app/tv/show/[id]/season/[seasonNumber]/page.tsx',
  'src/app/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]/page.tsx',
];

const highCardinalityServices = [
  'src/lib/services/tmdb/movie/credits/index.server.ts',
  'src/lib/services/tmdb/movie/detail/index.server.ts',
  'src/lib/services/tmdb/tv/credits/index.server.ts',
  'src/lib/services/tmdb/tv/detail/index.server.ts',
  'src/lib/services/tmdb/tv/episode/index.server.ts',
  'src/lib/services/tmdb/tv/season/index.server.ts',
];

test('unbounded media routes are dynamic and validate route parameters', () => {
  for (const path of highCardinalityRoutes) {
    const source = read(path);

    assert.match(source, /export const dynamic = 'force-dynamic'/, path);
    assert.match(source, /parsePositiveIntegerRouteParam/, path);
    assert.doesNotMatch(source, /force-static/, path);
    assert.doesNotMatch(source, /export const revalidate/, path);
  }
});

test('strict route parsing accepts only safe positive decimal integers', () => {
  assert.equal(parsePositiveIntegerRouteParam('1'), 1);
  assert.equal(parsePositiveIntegerRouteParam('123456'), 123_456);
  assert.equal(
    parsePositiveIntegerRouteParam(String(Number.MAX_SAFE_INTEGER)),
    Number.MAX_SAFE_INTEGER
  );

  for (const value of [
    '',
    '0',
    '-1',
    '+1',
    '01',
    '1.0',
    '1e3',
    ' 1',
    String(Number.MAX_SAFE_INTEGER + 1),
    'episode',
  ]) {
    assert.equal(parsePositiveIntegerRouteParam(value), null, value);
  }
});

test('high-cardinality TMDB server reads use the shared durable Data Cache window', () => {
  for (const path of highCardinalityServices) {
    const source = read(path);

    assert.match(source, /TMDB_REVALIDATE_SECONDS/, path);
    assert.match(
      source,
      /next:\s*\{\s*revalidate:\s*TMDB_REVALIDATE_SECONDS\./,
      path
    );
    assert.doesNotMatch(source, /cache: 'no-store'/, path);
  }

  const movieLists = read('src/lib/services/tmdb/movie/list/index.server.ts');
  const recommendations = movieLists.slice(
    movieLists.indexOf('export const getMovieRecommendationsServer')
  );

  assert.match(
    recommendations,
    /next:\s*\{\s*revalidate:\s*TMDB_REVALIDATE_SECONDS\.recommendations\s*\}/
  );
  assert.doesNotMatch(recommendations, /cache: 'no-store'/);
});

test('the TMDB proxy is rate limited and durably cached, keeping CDN headers', () => {
  const route = read('src/app/api/tmdb/[[...path]]/route.ts');

  assert.match(route, /export const dynamic = 'force-dynamic'/);
  // Abuse of the shared TMDB key is shed per IP before the upstream fetch.
  assert.match(route, /checkTmdbProxyRateLimit/);
  assert.match(route, /status: 429/);
  // Upstream reads are served from the Data Cache instead of hitting TMDB fresh.
  assert.match(route, /next:\s*\{\s*revalidate:\s*proxyRevalidateSeconds/);
  assert.doesNotMatch(route, /reqInit: \{ cache: 'no-store' \}/);
  // The CDN response layer is retained on top of the Data Cache.
  assert.match(route, /'Vercel-CDN-Cache-Control'/);
  assert.match(route, /s-maxage=86400/);
  assert.match(route, /Number\.isSafeInteger\(Number\(segment\)\)/);
  assert.doesNotMatch(route, /export const revalidate/);
});

test('durable caching is centralized and personalized caches stay short-lived', () => {
  // Every high-cardinality TMDB read shares one source of truth for windows,
  // including the user's requested popular/top-rated cadence.
  const constants = read('src/lib/services/tmdb/constants.ts');
  assert.match(constants, /TMDB_REVALIDATE_SECONDS/);
  assert.match(constants, /list: 86_400/);
  assert.match(constants, /topRated: 604_800/);

  assert.match(constants, /trending: 43_200/);

  // Home and Explore share one cached rail per list, so the same list is never
  // fetched twice with two different windows.
  const discovery = read('src/lib/pages/media/discovery-rails.server.ts');
  assert.equal(discovery.match(/unstable_cache\(/g)?.length, 7);
  assert.match(discovery, /revalidate: TMDB_REVALIDATE_SECONDS\.list/);
  assert.match(discovery, /revalidate: TMDB_REVALIDATE_SECONDS\.topRated/);
  assert.match(discovery, /revalidate: TMDB_REVALIDATE_SECONDS\.trending/);

  // The public profile statistics cache is bounded, not indefinite.
  const stats = read('src/lib/features/profile/profile-statistics.server.ts');
  assert.match(stats, /unstable_cache/);
  assert.match(stats, /PUBLIC_PROFILE_STATISTICS_REVALIDATE_SECONDS = 3600/);

  // Session-version reads are cached only briefly and always tag-busted, so
  // "sign out everywhere" stays effective.
  const authDatabase = read('src/lib/services/database/auth.server.ts');
  assert.match(authDatabase, /SESSION_VERSION_REVALIDATE_SECONDS = 30/);
  assert.match(authDatabase, /revalidateTag\(sessionVersionCacheTag/);
});

test('dynamic and personalized mutations do not trigger ISR invalidation', () => {
  for (const path of listSourceFiles('src')) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /revalidatePath/, path);
  }
});

test('episode and image pages tell compliant crawlers not to index or follow', () => {
  for (const path of [
    'src/app/movie/[id]/images/page.tsx',
    'src/app/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]/page.tsx',
  ]) {
    const source = read(path);

    assert.match(source, /robots:\s*\{ follow: false, index: false \}/, path);
  }
});
