/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');

const assertInOrder = (source, values) => {
  let previousIndex = -1;

  for (const value of values) {
    const index = source.indexOf(value);
    assert.ok(
      index > previousIndex,
      `Expected ${JSON.stringify(value)} in order`
    );
    previousIndex = index;
  }
};

const getExportBody = (source, exportName) => {
  const start = source.indexOf(`export const ${exportName}`);
  assert.notEqual(start, -1, `Missing export ${exportName}`);
  const nextExport = source.indexOf('\nexport const ', start + 1);

  return source.slice(start, nextExport === -1 ? undefined : nextExport);
};

test('public shell and Home content follow UX 1.1 and 1.2 order exactly', () => {
  const header = read('src/lib/layout/Header.tsx');
  const home = read('src/lib/pages/home/index.tsx');
  const config = read('src/lib/pages/home/config.ts');
  const footer = read('src/lib/layout/Footer.tsx');

  assertInOrder(header, [
    "label: 'Home'",
    "label: 'Register'",
    "label: 'Login'",
  ]);
  assertInOrder(home, [
    'TvSync',
    'Track your TV shows and movies in one place.',
    'TvSync focuses on a clean design and essential features, without',
    'Join a community of TV show and movie lovers.',
    'Create an Account',
  ]);
  assertInOrder(home, [
    'Track what you are watching',
    'Build your watchlist',
    'Discover new TV shows and movies',
    'Check what is popular',
    'View your personal statistics',
  ]);
  assertInOrder(config, [
    "'Popular Movies'",
    "'Highest-Rated Movies of All Time'",
    "'Popular TV Shows'",
    "'Highest-Rated TV Shows of All Time'",
  ]);
  assertInOrder(footer, [
    "label: 'Privacy Policy'",
    "label: 'Terms of Service'",
    "label: 'Contact'",
    'Copyright &copy;',
  ]);
  assert.doesNotMatch(home, /testimonial|pricing|news|carousel|quick search/i);
});

test('each successful preview is exactly nine posters with 3-column mobile and 9-column desktop grids', () => {
  const home = read('src/lib/pages/home/index.tsx');
  const config = read('src/lib/pages/home/config.ts');
  const loading = read('src/lib/components/shared/Section.tsx');

  assert.match(config, /HOME_PREVIEW_ITEM_COUNT = 9/);
  assert.match(home, /section\.items\.length !== HOME_PREVIEW_ITEM_COUNT/);
  assert.match(home, /section\.items\.map\(\(item\) =>/);
  assert.match(home, /base: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(home, /lg: 'repeat\(9, minmax\(0, 1fr\)\)'/);
  assert.match(loading, /base: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(loading, /lg: 'repeat\(9, minmax\(0, 1fr\)\)'/);
});

test('See All and poster links lead to the four complete lists and public detail routes', () => {
  const loader = read('src/lib/pages/home/load-home-discovery.server.ts');
  const poster = read('src/lib/components/shared/PosterCard.tsx');

  for (const path of [
    '/movies/popular',
    '/movies/top_rated',
    '/tv/popular',
    '/tv/top_rated',
  ]) {
    assert.match(
      loader,
      new RegExp(`buildHref\\(\\s*'${path.replaceAll('/', '\\/')}`)
    );
  }

  assert.match(poster, /movie: '\/movie'/);
  assert.match(poster, /tv: '\/tv\/show'/);
  assert.match(poster, /href=\{href\}/);
  assert.match(poster, /aria-label=\{`Open \$\{label\}`\}/);
});

test('popular and highest-rated queries have distinct intent and cached top-rated safeguards', () => {
  const loader = read('src/lib/pages/home/load-home-discovery.server.ts');

  assert.match(loader, /HOME_TMDB_REVALIDATE_SECONDS = 86_400/);
  assert.match(loader, /unstable_cache/);
  assert.match(loader, /\['home-popular-movies'\]/);
  assert.match(loader, /\['home-top-rated-movies'\]/);
  assert.match(loader, /\['home-popular-tv-shows'\]/);
  assert.match(loader, /\['home-top-rated-tv-shows'\]/);
  assert.match(loader, /sort_by: 'vote_average\.desc'/);
  assert.match(loader, /'vote_count\.gte': '10000'/);
  assert.match(loader, /'vote_count\.gte': '1500'/);

  const popularMovie = loader.slice(
    loader.indexOf('const loadPopularMovies ='),
    loader.indexOf('const loadTopRatedMovies =')
  );
  const popularTv = loader.slice(
    loader.indexOf('const loadPopularTVShows ='),
    loader.indexOf('const loadTopRatedTVShows =')
  );

  assert.match(popularMovie, /params: \{ page: 1 \}/);
  assert.doesNotMatch(popularMovie, /vote_average|vote_count|sort_by/);
  assert.match(popularTv, /\{ page: 1 \}/);
  assert.doesNotMatch(popularTv, /vote_average|vote_count|sort_by/);
});

test('movie, TV, season, and episode details remain publicly readable', () => {
  const routes = [
    'src/app/movie/[id]/page.tsx',
    'src/app/tv/show/[id]/page.tsx',
    'src/app/tv/show/[id]/season/[seasonNumber]/page.tsx',
    'src/app/tv/show/[id]/season/[seasonNumber]/episode/[episodeNumber]/page.tsx',
  ];

  for (const route of routes) {
    const source = read(route);
    assert.doesNotMatch(source, /getServerSession|redirect\(['"]\/login/);
    assert.match(
      source,
      /get(MovieDetail|TvShowDetail|TVSeasonDetails|TVEpisodeDetails)/
    );
  }
});

test('tracking, watchlist, and rating mutations authenticate before writes and preserve callback context', () => {
  const tracking = read('src/lib/features/tracking/actions.ts');
  const watchlist = read('src/lib/features/watchlist/actions.ts');
  const ratings = read('src/lib/features/reviews/actions.ts');

  const trackingMutation = getExportBody(tracking, 'setMediaWatchStatus');
  assert.ok(
    trackingMutation.indexOf('await ensureAuthenticated()') <
      trackingMutation.indexOf('await upsertOwnMedia')
  );
  assert.match(trackingMutation, /status: 'login_required'/);

  const watchlistMutation = getExportBody(watchlist, 'addToWatchlist');
  assert.ok(
    watchlistMutation.indexOf('await ensureAuthenticated()') <
      watchlistMutation.indexOf('await upsertOwnWatchlistItem')
  );
  assert.match(watchlistMutation, /status: 'login_required'/);

  const ratingMutation = getExportBody(ratings, 'saveRating');
  assert.ok(
    ratingMutation.indexOf('await getServerSession(authOptions)') <
      ratingMutation.indexOf('await upsertOwnRating')
  );
  assert.match(ratingMutation, /status: 'login_required'/);

  for (const control of [
    'src/lib/features/watchlist/watchlist-button.tsx',
    'src/lib/features/tracking/media-status-control.tsx',
    'src/lib/features/reviews/rating-input.tsx',
  ]) {
    const source = read(control);
    assert.match(source, /callbackUrl/);
    assert.match(source, /encodeURIComponent\(callbackUrl\)/);
    assert.match(source, /router\.push\(getLoginHref/);
  }
});

test('loading, empty, incomplete, and per-section API errors retain the four-section structure', () => {
  const home = read('src/lib/pages/home/index.tsx');
  const loader = read('src/lib/pages/home/load-home-discovery.server.ts');

  assert.match(home, /HOME_SECTION_TITLES\.map\(\(title\) =>/);
  assert.match(home, /SectionLoading count=\{HOME_PREVIEW_ITEM_COUNT\}/);
  assert.match(home, /section\.items\.length === 0/);
  assert.match(home, /There are no titles available in this list right now\./);
  assert.match(home, /TMDB returned an incomplete preview\./);
  assert.match(home, /if \(section\.error\)/);
  assert.match(home, /This section could not be loaded from TMDB\./);
  assert.match(loader, /catch \(error\)/);
  assert.match(loader, /error: getErrorMessage\(error\)/);
  assert.match(loader, /Promise\.all\(\[/);
});
