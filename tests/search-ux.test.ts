/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to the requirement they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  filterAndSortTitleResults,
  getProviderPagePlan,
  getProviderSort,
  getSearchGenre,
  getSearchMediaType,
  getSearchPage,
  getSearchSort,
  getSearchTotalPages,
  mergeProviderResults,
  SEARCH_MAX_PAGE,
  SEARCH_RESULTS_PER_PAGE,
} from '../src/lib/pages/search/search-state';
import { movieListEndpoint } from '../src/lib/services/tmdb/movie/list/utils';
import { tvShowListEndpoint } from '../src/lib/services/tmdb/tv/list/utils';
import { MediaType } from '../src/lib/types';

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

test('Search exposes exactly linkable Movies and TV Shows tabs with type-scoped data', async () => {
  const [page, movies, tvShows, route] = await Promise.all([
    read('src/lib/pages/search/multi/index.tsx'),
    read('src/lib/pages/movies/index.tsx'),
    read('src/lib/pages/tv-shows/index.tsx'),
    read('src/app/search/page.tsx'),
  ]);

  assert.match(page, /label: 'Movies'/);
  assert.match(page, /label: 'TV Shows'/);
  assert.doesNotMatch(page, /label: 'All'/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /role="tab"/);
  assert.match(page, /role="tabpanel"/);
  assert.match(page, /selectTab\(tab\.value\)/);
  assert.equal(getSearchMediaType('movie'), MediaType.Movie);
  assert.equal(getSearchMediaType('tv'), MediaType.Tv);
  assert.equal(getSearchMediaType('person'), MediaType.Movie);
  assert.match(movies, /'\/search\?type=movie'/);
  assert.match(tvShows, /'\/search\?type=tv'/);
  assert.match(route, /getCallbackUrl\(await searchParams\)/);
});

test('title submit and termless browsing use the correct TMDB endpoint families', async () => {
  const [page, hook, movieClient, tvClient] = await Promise.all([
    read('src/lib/pages/search/multi/index.tsx'),
    read('src/lib/pages/search/use-search-results.ts'),
    read('src/lib/services/tmdb/movie/list/index.client.ts'),
    read('src/lib/services/tmdb/tv/list/index.client.ts'),
  ]);

  assert.match(page, /<form onSubmit=\{submitSearch\}>/);
  assert.match(page, /<Field\.Label>Search by title<\/Field\.Label>/);
  assert.match(page, /query: inputValue\.trim\(\) \|\| null/);
  assert.match(hook, /query\s*\? \{ query \}/);
  assert.match(hook, /sort_by: providerSort/);
  assert.match(hook, /useTVShowSearchResultList/);
  assert.match(movieClient, /movieListEndpoint/);
  assert.match(tvClient, /TV_SHOW_SEARCH_RESOURCE_PATH/);
  assert.equal(
    movieListEndpoint({ query: 'Alien', section: 'popular' }),
    '/search/movie'
  );
  assert.equal(
    movieListEndpoint({ section: 'popular', sort_by: 'popularity.desc' }),
    '/discover/movie'
  );
  assert.equal(
    tvShowListEndpoint({ listType: 'popular', sort_by: 'popularity.desc' }),
    '/discover/tv'
  );
});

test('genre and all three requested sort orders are validated and deterministic', async () => {
  const [page, hook, genreClient, proxy] = await Promise.all([
    read('src/lib/pages/search/multi/index.tsx'),
    read('src/lib/pages/search/use-search-results.ts'),
    read('src/lib/services/tmdb/genre/index.client.ts'),
    read('src/app/api/tmdb/[[...path]]/route.ts'),
  ]);
  const fixtures = [
    {
      date: '2025-01-01',
      genre_ids: [18],
      id: 1,
      popularity: 10,
      vote_average: 7,
    },
    {
      date: '2026-01-01',
      genre_ids: [35],
      id: 2,
      popularity: 30,
      vote_average: 6,
    },
    {
      date: '',
      genre_ids: [18],
      id: 3,
      popularity: 20,
      vote_average: 9,
    },
  ];

  assert.match(page, /<Field\.Label>Filter by genre<\/Field\.Label>/);
  assert.match(page, /<option value="popularity">Popularity<\/option>/);
  assert.match(page, /<option value="rating">Rating<\/option>/);
  assert.match(page, /<option value="release">Release date<\/option>/);
  assert.match(page, /TMDB returns title searches by relevance/);
  assert.match(hook, /with_genres: genre \|\| undefined/);
  assert.match(genreClient, /`\/genre\/\$\{mediaType\}\/list`/);
  assert.match(proxy, /nestedResource === 'list'/);
  assert.equal(getSearchGenre('18'), '18');
  assert.equal(getSearchGenre('not-a-genre'), '');
  assert.equal(getSearchSort('unknown'), 'popularity');
  assert.equal(
    getProviderSort(MediaType.Movie, 'release'),
    'primary_release_date.desc'
  );
  assert.equal(getProviderSort(MediaType.Tv, 'release'), 'first_air_date.desc');
  assert.deepEqual(
    filterAndSortTitleResults(
      fixtures,
      '',
      'popularity',
      (item) => item.date
    ).map((item) => item.id),
    [2, 3, 1]
  );
  assert.deepEqual(
    filterAndSortTitleResults(
      fixtures,
      '18',
      'rating',
      (item) => item.date
    ).map((item) => item.id),
    [3, 1]
  );
  assert.deepEqual(
    filterAndSortTitleResults(fixtures, '', 'release', (item) => item.date).map(
      (item) => item.id
    ),
    [2, 1, 3]
  );
});

test('27-item application pages aggregate TMDB pages without gaps or duplicates', () => {
  const providerResults = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => ({ id: from + index }));

  assert.equal(SEARCH_RESULTS_PER_PAGE, 27);
  assert.deepEqual(getProviderPagePlan(1), { offset: 0, pages: [1, 2] });
  assert.deepEqual(getProviderPagePlan(2), { offset: 7, pages: [2, 3] });
  assert.deepEqual(getProviderPagePlan(3), {
    offset: 14,
    pages: [3, 4, 5],
  });
  assert.deepEqual(
    mergeProviderResults(
      [providerResults(21, 40), providerResults(41, 60)],
      getProviderPagePlan(2).offset
    ).map((item) => item.id),
    providerResults(28, 54).map((item) => item.id)
  );
  assert.equal(
    mergeProviderResults([[{ id: 1 }, { id: 1 }, { id: 2 }]], 0).length,
    2
  );
  assert.equal(getSearchTotalPages(54), 2);
  assert.equal(getSearchPage('9999'), SEARCH_MAX_PAGE);
});

test('filter, tab, title, and sort changes reset pagination while history remains URL-driven', async () => {
  const page = await read('src/lib/pages/search/multi/index.tsx');

  assert.match(page, /useSearchParams\(\)/);
  assert.match(page, /router\[navigation\]\(href\)/);
  assert.match(page, /changeParams\(\{ page: '1', query:/);
  assert.match(page, /genre: event\.target\.value \|\| null,/);
  assert.match(
    page,
    /changeParams\(\{ page: '1', sort: event\.target\.value \}\)/
  );
  assert.match(
    page,
    /changeParams\(\{ genre: null, page: '1', type: nextMediaType \}\)/
  );
  assert.match(page, /page > totalPages/);
  assert.match(page, /'replace'/);
});

test('responsive results, poster navigation, pagination, and all required states are present', async () => {
  const [page, poster, image, pagination] = await Promise.all([
    read('src/lib/pages/search/multi/index.tsx'),
    read('src/lib/components/shared/PosterCard.tsx'),
    read('src/lib/components/shared/PosterImage.tsx'),
    read('src/lib/components/shared/list/page-nav-buttons.tsx'),
  ]);

  assert.match(page, /base: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(page, /md: 'repeat\(auto-fill, minmax\(8\.5rem, 1fr\)\)'/);
  assert.match(page, /SectionLoading count=\{SEARCH_RESULTS_PER_PAGE\}/);
  assert.match(page, /Loading page \$\{page\}/);
  assert.match(page, /title="No titles found"/);
  assert.match(page, /title="Unable to load results"/);
  assert.match(page, /Try again/);
  assert.match(page, /<PageNavButtons \{\.\.\.navProps\} \/>/);
  assert.match(pagination, /onClickNext/);
  assert.match(pagination, /onClickPrev/);
  assert.match(poster, /movie: '\/movie'/);
  assert.match(poster, /tv: '\/tv\/show'/);
  assert.match(poster, /href=\{href\}/);
  assert.match(image, /Poster unavailable/);
});

test('quick library actions use batched status input, type-correct options, and duplicate-safe persistence', async () => {
  const [page, route, action, loader, query, swr] = await Promise.all([
    read('src/lib/pages/search/multi/index.tsx'),
    read('src/app/search/page.tsx'),
    read('src/lib/features/library/search-library-action.tsx'),
    read('src/lib/pages/search/load-search-library-state.server.ts'),
    read('src/lib/services/database/library-queries.ts'),
    read('src/lib/services/tmdb/utils.client.ts'),
  ]);

  assert.match(route, /loadSearchLibraryState\(\)/);
  assert.match(loader, /listOwnMedia\(\)/);
  assert.doesNotMatch(page, /WatchlistStateButton/);
  assert.match(page, /initialLibraryItems/);
  assert.match(page, /status=\{getSearchStatusLabel\(status\)\}/);
  assert.match(action, /Add to library/);
  assert.match(action, /MOVIE_WATCH_STATUSES/);
  assert.match(action, /TV_LIBRARY_STATUSES/);
  assert.doesNotMatch(action, /TV_WATCH_STATUSES/);
  assert.match(action, /setMediaWatchStatus/);
  assert.match(action, /Added to your library/);
  assert.match(action, /Could not add this title/);
  assert.match(
    query,
    /on conflict \(user_id, tmdb_id, media_type\) do nothing/
  );
  assert.match(
    swr,
    /useSWR<ResType, ErrorType>\(isReady \? \[path, params\] : null/
  );
  assert.doesNotMatch(
    await read('src/lib/pages/search/use-search-results.ts'),
    /useEffect/
  );
});
