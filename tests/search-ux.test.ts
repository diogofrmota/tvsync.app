/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  getSearchQuery,
  getSearchResultKey,
  mergeSearchResultsByPopularity,
  type SearchResultItem,
} from '../src/lib/pages/search/search-state';
import { movieListEndpoint } from '../src/lib/services/tmdb/movie/list/utils';
import { tvShowListEndpoint } from '../src/lib/services/tmdb/tv/list/utils';
import { MediaType } from '../src/lib/types';

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

const makeResult = (
  id: number,
  mediaType: SearchResultItem['mediaType'],
  popularity: number,
  title = `Title ${id}`
): SearchResultItem => ({
  id,
  mediaType,
  popularity,
  posterPath: null,
  title,
});

test('a search shows one plain result list with no tabs, genre filter, or sort control', async () => {
  const [page, route] = await Promise.all([
    read('src/lib/pages/search/results/index.tsx'),
    read('src/app/explore/page.tsx'),
  ]);

  for (const removedControl of [
    /role="tablist"/,
    /role="tab"/,
    /label: 'Movies'/,
    /label: 'TV Shows'/,
    /Filter by genre/,
    /Sort results/,
    /Search by title/,
    /NativeSelect/,
    /PageNavButtons/,
  ]) {
    assert.doesNotMatch(page, removedControl);
  }

  assert.match(page, /Movies and TV shows related to/);
  assert.match(page, /most popular first/);
  assert.match(page, /<PosterCard/);
  // Only a search term switches Explore from discovery to results; genre,
  // type, sort, and page intents no longer exist.
  assert.match(route, /const resolvedSearchParams = await searchParams;/);
  assert.match(route, /getSearchQuery\(firstValue\(searchParams\.query\)\)/);
  assert.match(route, /if \(!query\) \{\s*return <ExploreDiscover \/>;/);
  assert.doesNotMatch(route, /genre|sort|SEARCH_INTENT_KEYS/);
});

test('results merge movies and TV shows into one popularity-ordered list', () => {
  const merged = mergeSearchResultsByPopularity([
    [makeResult(1, MediaType.Movie, 10), makeResult(2, MediaType.Movie, 90)],
    [makeResult(2, MediaType.Tv, 50), makeResult(3, MediaType.Tv, 70)],
  ]);

  assert.deepEqual(
    merged.map(getSearchResultKey),
    ['movie:2', 'tv:3', 'tv:2', 'movie:1'],
    'movies and TV shows share one list ordered by popularity'
  );
  // The same TMDB id in both media types is not a duplicate.
  assert.equal(merged.length, 4);

  const deduplicated = mergeSearchResultsByPopularity([
    [makeResult(4, MediaType.Movie, 5), makeResult(4, MediaType.Movie, 5)],
  ]);
  assert.equal(deduplicated.length, 1);

  const tied = mergeSearchResultsByPopularity([
    [
      makeResult(5, MediaType.Movie, 8, 'Zulu'),
      makeResult(6, MediaType.Movie, 8, 'Alien'),
    ],
  ]);
  assert.deepEqual(
    tied.map((item) => item.title),
    ['Alien', 'Zulu'],
    'equal popularity falls back to a stable title order'
  );
});

test('the search term is trimmed and drives the TMDB search endpoints for both media types', async () => {
  const hook = await read('src/lib/pages/search/use-search-results.ts');

  assert.equal(getSearchQuery('  Alien  '), 'Alien');
  assert.equal(getSearchQuery(null), '');
  assert.match(hook, /useMovieList\(\s*'popular',\s*\{ page: 1, query \}/);
  assert.match(
    hook,
    /useTVShowSearchResultList\(\{ page: 1, query \}, isReady\)/
  );
  assert.match(hook, /const isReady = query\.length > 0/);
  assert.equal(
    movieListEndpoint({ query: 'Alien', section: 'popular' }),
    '/search/movie'
  );
  assert.equal(
    tvShowListEndpoint({ listType: 'popular', sort_by: 'popularity.desc' }),
    '/discover/tv'
  );
});

test('responsive results, poster navigation, and all required states are present', async () => {
  const [page, grid, poster, image] = await Promise.all([
    read('src/lib/pages/search/results/index.tsx'),
    read('src/lib/components/shared/GridContainer.tsx'),
    read('src/lib/components/shared/PosterCard.tsx'),
    read('src/lib/components/shared/PosterImage.tsx'),
  ]);

  assert.match(grid, /base: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(grid, /md: 'repeat\(6, minmax\(0, 1fr\)\)'/);
  assert.match(page, /SectionLoading count=\{RESULT_SKELETON_COUNT\}/);
  assert.match(page, /Loading results for \$\{query\}/);
  assert.match(page, /title="No titles found"/);
  assert.match(page, /title="Unable to load results"/);
  assert.match(page, /Try again/);
  assert.match(poster, /movie: '\/movie'/);
  assert.match(poster, /tv: '\/tv\/show'/);
  assert.match(poster, /href=\{href\}/);
  assert.match(image, /Poster unavailable/);
});

test('quick library actions keep working on results and stay batched', async () => {
  const [page, route, loader, query, swr] = await Promise.all([
    read('src/lib/pages/search/results/index.tsx'),
    read('src/app/explore/page.tsx'),
    read('src/lib/pages/search/load-search-library-state.server.ts'),
    read('src/lib/services/database/library-queries.ts'),
    read('src/lib/services/tmdb/utils.client.ts'),
  ]);

  assert.match(route, /loadSearchLibraryState\(\)/);
  assert.match(loader, /listOwnMedia\(\)/);
  assert.match(page, /initialLibraryItems/);
  assert.match(page, /seedLibrary\(initialLibraryItems\)/);
  // Discovery surfaces keep the "Added" chip; only the user's own library
  // pages drop it, so the results grid uses the default poster card.
  assert.doesNotMatch(page, /libraryBadges/);
  assert.match(
    query,
    /on conflict \(user_id, tmdb_id, media_type\) do nothing/
  );
  assert.match(
    swr,
    /useSWR<ResType, ErrorType>\(isReady \? \[path, params\] : null/
  );
});

test('Explore discovery drops the recommendation rail and the genre browser', async () => {
  const [discover, rails] = await Promise.all([
    read('src/lib/pages/explore/discover.server.tsx'),
    read('src/lib/pages/media/discovery-rails.ts'),
  ]);

  assert.doesNotMatch(discover, /Recommended for you/);
  assert.doesNotMatch(discover, /getMovieRecommendationsServer/);
  assert.doesNotMatch(discover, /GenreChips|Browse by genre/);
  // Explore shows every shared rail, named by the shared definitions so the
  // lists it has in common with Home read identically on both pages.
  assert.match(discover, /loadDiscoveryRails\('explore'\)/);
  for (const rail of [
    'Trending Movies This Week',
    'Trending TV Shows This Week',
    'New & Upcoming Movies',
    'Popular Movies',
    'Popular TV Shows',
    'Highest-Rated Movies',
    'Highest-Rated TV Shows',
  ]) {
    assert.ok(rails.includes(`'${rail}'`), `Expected the ${rail} rail`);
  }
});

test('Explore leads with the reworded subtitle and a readable search field', async () => {
  const [discover, searchBar] = await Promise.all([
    read('src/lib/pages/explore/discover.server.tsx'),
    read('src/lib/pages/media/media-search-bar.tsx'),
  ]);

  assert.match(
    discover,
    /subtitle="Discover trending titles, new releases and all-time highlights across movies and tv shows\."/
  );
  assert.doesNotMatch(discover, /all in one place/);
  // The field is wide enough to read its own placeholder before typing.
  assert.match(discover, /placeholder="Search movies and TV shows"/);
  assert.match(searchBar, /minWidth=\{\{ base: 'auto', md: '26rem' \}\}/);
});
