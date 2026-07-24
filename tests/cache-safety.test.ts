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
  'src/app/person/[id]/page.tsx',
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

test('high-cardinality TMDB server reads opt out of durable data caching', () => {
  for (const path of highCardinalityServices) {
    const source = read(path);

    assert.match(source, /cache: 'no-store'/, path);
    assert.doesNotMatch(source, /next:\s*\{\s*revalidate/, path);
  }

  const movieLists = read('src/lib/services/tmdb/movie/list/index.server.ts');
  const recommendations = movieLists.slice(
    movieLists.indexOf('export const getMovieRecommendationsServer')
  );

  assert.match(recommendations, /cache: 'no-store'/);
  assert.doesNotMatch(recommendations, /next:\s*\{\s*revalidate/);
});

test('the TMDB proxy uses CDN-only response caching', () => {
  const route = read('src/app/api/tmdb/[[...path]]/route.ts');

  assert.match(route, /export const dynamic = 'force-dynamic'/);
  assert.match(route, /reqInit: \{ cache: 'no-store' \}/);
  assert.match(route, /'Vercel-CDN-Cache-Control'/);
  assert.match(route, /s-maxage=86400/);
  assert.match(route, /Number\.isSafeInteger\(Number\(segment\)\)/);
  assert.doesNotMatch(route, /export const revalidate/);
});

test('durable revalidation remains limited to bounded discovery sources', () => {
  const allowedCacheFiles = new Set([
    join('src', 'lib', 'pages', 'home', 'load-home-discovery.server.ts'),
    join('src', 'lib', 'services', 'tmdb', 'movie', 'list', 'index.server.ts'),
    join('src', 'lib', 'services', 'tmdb', 'tv', 'list', 'index.server.ts'),
  ]);
  const cacheFiles = listSourceFiles('src').filter((path) => {
    const source = readFileSync(path, 'utf8');

    return /unstable_cache|next:\s*\{\s*revalidate/.test(source);
  });

  assert.deepEqual(
    cacheFiles.map((path) => join(...path.split(/[\\/]/))).sort(),
    Array.from(allowedCacheFiles).sort()
  );

  const homeCache = read('src/lib/pages/home/load-home-discovery.server.ts');
  assert.equal(homeCache.match(/unstable_cache\(/g)?.length, 4);
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
