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
  const hero = read('src/lib/pages/home/Hero.tsx');
  const config = read('src/lib/pages/home/config.ts');
  const footer = read('src/lib/layout/Footer.tsx');

  assertInOrder(header, [
    "label: 'Home'",
    "label: 'Register'",
    "label: 'Login'",
  ]);
  // The signed-out hero lives in its own client component. Its contract is the
  // order of headline, promise, cost, and the two account calls to action.
  assertInOrder(hero, [
    'Everything you watch,',
    'synced in one place',
    'Track Movies and TV Shows you are watching and discover what to',
    'Free to use',
    'Create your account',
    'Log in',
  ]);
  assertInOrder(hero, [
    'Track what you watch',
    'Build your watchlist',
    'Discover what to watch',
    'See your progress',
  ]);
  assertInOrder(config, [
    "'Popular Movies'",
    "'Highest-Rated Movies'",
    "'Popular TV Shows'",
    "'Highest-Rated TV Shows'",
  ]);
  assertInOrder(footer, [
    "label: 'Privacy Policy'",
    "label: 'Terms of Service'",
    "label: 'Contact'",
    'Copyright &copy;',
  ]);
  assert.doesNotMatch(
    `${home}\n${hero}`,
    /testimonial|pricing|news|carousel|quick search/i
  );
});

test('each successful preview is one shared horizontally scrollable rail of ten posters', () => {
  const home = read('src/lib/pages/home/index.tsx');
  const config = read('src/lib/pages/home/config.ts');
  const rail = read('src/lib/components/shared/MediaRail.tsx');
  const explore = read('src/lib/pages/explore/discover.server.tsx');
  const overview = read('src/lib/pages/media/overview.tsx');
  const profile = read('src/lib/pages/profile/index.tsx');

  assert.match(rail, /MEDIA_RAIL_ITEM_LIMIT = 10/);
  assert.match(config, /HOME_PREVIEW_ITEM_COUNT = MEDIA_RAIL_ITEM_LIMIT/);
  assert.match(home, /section\.items\.length !== HOME_PREVIEW_ITEM_COUNT/);

  // Home, Explore, the Movies/TV overviews, and Profile share one rail.
  for (const source of [home, explore, overview, profile]) {
    assert.match(source, /from 'lib\/components\/shared\/MediaRail'/);
    assert.match(source, /<MediaRail\b/);
  }

  // The trailing rail tile matches the section action wording.
  assert.match(rail, /See All/);
  assert.doesNotMatch(rail, /Browse All/);
  assert.match(rail, /overflowX="auto"/);
  assert.match(rail, /scrollSnapType="x proximity"/);
  assert.match(rail, /layout="flex"/);
  assert.doesNotMatch(home, /repeat\(9, minmax\(0, 1fr\)\)/);
});

test('the Explore featured area is a ten-slide carousel of poster, name, trailer, and rating', () => {
  const hero = read('src/lib/pages/explore/hero.tsx');
  const slides = read('src/lib/pages/explore/hero-slides.server.ts');
  const discover = read('src/lib/pages/explore/discover.server.tsx');

  assert.match(hero, /^'use client';/);
  assert.match(hero, /EXPLORE_HERO_SLIDE_COUNT = 10/);
  assert.match(hero, /AUTO_ADVANCE_MS = 5000/);
  assert.match(hero, /aria-roledescription="carousel"/);
  assert.match(hero, /Previous featured title/);
  assert.match(hero, /Next featured title/);
  assert.match(hero, /slice\(0, EXPLORE_HERO_SLIDE_COUNT\)/);

  // Every slide leads with the poster and the name, then the star rating and
  // the trailer link.
  assertInOrder(hero, ['<PosterImage', '<SlideRating', 'Watch trailer']);
  assert.match(hero, /<Heading[\s\S]{0,400}\{slide\.title\}/);
  assert.match(hero, /⭐/);
  assert.match(hero, /\$\{source\} rating/);
  // The star never relabels a TMDB score as an IMDb one.
  assert.match(hero, /const source = isImdb \? 'IMDb' : 'TMDB';/);

  // Trailer keys and IMDb scores come from the trusted server helpers only.
  assert.match(slides, /^import 'server-only';/);
  assert.match(slides, /selectTrustedMovieTrailer/);
  assert.match(slides, /selectTrustedTvTrailer/);
  assert.match(slides, /getImdbRatingServer/);
  assert.match(slides, /slice\(0, EXPLORE_HERO_SLIDE_COUNT\)/);
  assert.match(discover, /<ExploreHero slides=\{heroSlides\}/);
  assert.match(discover, /buildExploreHeroSlides/);
});

test('See All opens one complete 30-title list with no pagination controls', () => {
  const mediaList = read('src/lib/pages/media/media-list.server.tsx');
  const movieRoute = read('src/app/movies/[section]/page.tsx');
  const genreRoute = read('src/app/movies/genre/[genre]/page.tsx');
  const tvRoute = read('src/app/tv/[listType]/page.tsx');

  assert.match(mediaList, /MEDIA_LIST_ITEM_LIMIT = 30/);
  assert.match(mediaList, /slice\(\s*0,\s*MEDIA_LIST_ITEM_LIMIT\s*\)/);
  assert.match(movieRoute, /<MovieListPage\b/);
  assert.match(genreRoute, /<MovieListPage\b/);
  assert.match(tvRoute, /<TVShowListPage\b/);

  for (const source of [mediaList, movieRoute, genreRoute, tvRoute]) {
    assert.doesNotMatch(source, /PageNavButtons|totalPages|onClickNext/);
  }
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

  // Popular refreshes daily; highest-rated only needs a weekly refresh.
  assert.match(loader, /HOME_POPULAR_REVALIDATE_SECONDS = 86_400/);
  assert.match(loader, /HOME_TOP_RATED_REVALIDATE_SECONDS = 604_800/);
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
      watchlistMutation.indexOf('await addOwnLibraryItem')
  );
  assert.match(watchlistMutation, /status: 'login_required'/);

  const ratingMutation = getExportBody(ratings, 'saveRating');
  assert.ok(
    ratingMutation.indexOf('await getAuthSession()') <
      ratingMutation.indexOf('await upsertOwnRating')
  );
  assert.match(ratingMutation, /emptyResult\('login_required'\)/);

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
  assert.match(home, /MediaRailLoading count=\{HOME_PREVIEW_ITEM_COUNT\}/);
  assert.match(home, /section\.items\.length === 0/);
  assert.match(home, /There are no titles available in this list right now\./);
  assert.match(home, /TMDB returned an incomplete preview\./);
  assert.match(home, /if \(section\.error\)/);
  assert.match(home, /This section could not be loaded from TMDB\./);
  assert.match(loader, /catch \(error\)/);
  assert.match(loader, /error: getErrorMessage\(error\)/);
  assert.match(loader, /Promise\.all\(\[/);
});
