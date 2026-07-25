/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirement they protect. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are invoked only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  normalizeMovieVideosResponse,
  selectTrustedMovieTrailer,
} from '../src/lib/services/tmdb/movie/videos/utils';

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');

const assertInOrder = (source: string, values: Array<string>) => {
  let previousIndex = -1;

  for (const value of values) {
    const index = source.indexOf(value, previousIndex + 1);
    assert.ok(
      index > previousIndex,
      `Expected ${JSON.stringify(value)} in order`
    );
    previousIndex = index;
  }
};

test('movie details remain public and load required sections independently', async () => {
  const route = await read('src/app/movie/[id]/page.tsx');

  assert.match(route, /getMovieDetailServer\(movieId\)/);
  assert.match(route, /getMovieCreditsServer\(movieId\)\.catch/);
  assert.match(route, /getMovieVideosServer\(movieId\)\.catch/);
  assert.doesNotMatch(route, /getSimilarMoviesServer/);
  assert.doesNotMatch(route, /getMovieWatchProvidersServer/);
  assert.doesNotMatch(route, /redirect\(['"]\/login/);
  assert.doesNotMatch(route, /notFound\(\)[\s\S]*getServerSession/);
});

test('movie page renders required metadata and focused sections in a clear hierarchy', async () => {
  const page = await read('src/lib/pages/movie/detail/index.tsx');

  // The header carries the poster and every fact, the personal controls come
  // straight after it, and the longer reading sections close the page.
  assertInOrder(page, [
    'poster`}',
    'as="h1"',
    'Release year:',
    'Runtime:',
    'Status:',
    '<GenreList',
    'Director:',
    '<ImdbRatingPanel',
    'Your movie',
    'Description',
    '<MovieTrailer',
    '<CastsWrapper',
  ]);
  assert.doesNotMatch(
    page,
    /ReviewsSection|RecommendForm|Recommended movies|Revenue:|gallery/i
  );
  assert.doesNotMatch(page, /StreamingAvailability|Similar movies/);
});

test('missing movie metadata is represented honestly and IMDb is never backed by TMDB votes', async () => {
  const [page, trailer, detailUtils, imdbPanel] = await Promise.all([
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/pages/movie/detail/components/trailer.tsx'),
    read('src/lib/services/tmdb/movie/detail/utils.ts'),
    read('src/lib/components/shared/ImdbRating.tsx'),
  ]);
  const renderedDetailSources = `${page}\n${trailer}`;

  for (const fallback of [
    'Untitled movie',
    "'Unavailable'",
    'Genres unavailable',
    'No description is available from TMDB.',
    'No trusted trailer is available.',
  ]) {
    assert.match(
      renderedDetailSources,
      new RegExp(fallback.replaceAll('.', '\\.'))
    );
  }

  // The IMDb value comes from OMDb, so an absent rating stays unavailable and
  // TMDB vote data is never shown in its place.
  assert.match(imdbPanel, /IMDb rating[\s\S]*Unavailable/);
  assert.match(imdbPanel, /rating\.rating\.toFixed\(1\)/);
  assert.doesNotMatch(imdbPanel, /vote_average|TMDB rating/);
  assert.doesNotMatch(page, /vote_average|TMDB rating/);
  assert.match(page, /<ImdbRatingPanel[\s\S]{0,80}movie\.imdb_id/);
  assert.doesNotMatch(
    detailUtils,
    /status: response\?\.status \?\? 'Released'/
  );
});

test('trailer playback accepts only normalized YouTube trailer identifiers', async () => {
  const component = await read(
    'src/lib/pages/movie/detail/components/trailer.tsx'
  );
  const videos = normalizeMovieVideosResponse({
    id: 1,
    results: [
      {
        id: 'vimeo',
        key: 'arbitrary-url',
        name: 'Wrong host',
        official: true,
        publishedAt: '',
        site: 'Vimeo',
        type: 'Trailer',
      },
      {
        id: 'teaser',
        key: 'abcdefghijk',
        name: 'Teaser',
        official: true,
        publishedAt: '',
        site: 'YouTube',
        type: 'Teaser',
      },
      {
        id: 'trailer',
        key: '123456789_-',
        name: 'Official trailer',
        official: true,
        publishedAt: '',
        site: 'YouTube',
        type: 'Trailer',
      },
    ],
  });

  assert.equal(selectTrustedMovieTrailer(videos)?.id, 'trailer');
  assert.match(
    component,
    /https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{trailer\.key\}/
  );
  assert.match(component, /allowFullScreen/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|trailer\.url/);
});

test('cast list is shown but no longer links to per-person pages', async () => {
  const [cast, page] = await Promise.all([
    read('src/lib/pages/movie/detail/components/casts-wrapper.tsx'),
    read('src/lib/pages/movie/detail/index.tsx'),
  ]);

  assert.match(page, /<CastsWrapper/);
  assert.match(cast, /Cast</);
  assert.match(cast, /\{movieCast\.name\}/);
  assert.doesNotMatch(cast, /\/person\//);
  assert.doesNotMatch(cast, /<Link|href=/);
  assert.doesNotMatch(cast, /next\/link/);
});

test('movie detail no longer exposes streaming or similar sections', async () => {
  const page = await read('src/lib/pages/movie/detail/index.tsx');

  assert.doesNotMatch(page, /StreamingAvailability/);
  assert.doesNotMatch(page, /Similar movies|similarMovie|SliderContainer/);
});

test('authenticated library actions add with status, update, remove, and roll back failures', async () => {
  const [control, actions] = await Promise.all([
    read('src/lib/features/library/movie-detail-library-control.tsx'),
    read('src/lib/features/library/actions.ts'),
  ]);

  for (const label of [
    'Add to Library',
    'Planned to Watch',
    'Finished',
    'Current status:',
    'Remove from Library',
  ]) {
    assert.match(control, new RegExp(label));
  }
  assert.match(control, /await updateMovieLibraryStatus/);
  assert.match(control, /await removeMovieFromLibrary/);
  assert.match(control, /setStatus\(previousStatus\)/);
  assert.match(control, /setSelectedStatus\(previousSelectedStatus\)/);
  assert.match(
    control,
    /role=\{message\.startsWith\('We could not'\) \? 'alert'/
  );
  assert.doesNotMatch(control, /window\.location|location\.reload/);
  assert.match(actions, /await isAuthenticated\(\)/);
  assert.match(actions, /status: 'login_required'/);
});

test('favourite and personal rating mutations authenticate, reconcile, and support create or update', async () => {
  const [favorite, favoriteActions, rating, ratingActions, database] =
    await Promise.all([
      read('src/lib/features/profile/favorite-button.tsx'),
      read('src/lib/features/profile/favorite-actions.ts'),
      read('src/lib/features/reviews/rating-input.tsx'),
      read('src/lib/features/reviews/actions.ts'),
      read('src/lib/services/database/tracking.server.ts'),
    ]);

  assert.match(favorite, /Mark as Favourite/);
  assert.match(favorite, /Remove from Favourites/);
  assert.match(favorite, /setFavorite\(favorite\)/);
  assert.match(favoriteActions, /status: 'login_required'/);
  assert.match(rating, /await saveRating/);
  assert.match(rating, /setState\(previousState\)/);
  assert.match(rating, /Your rating was saved/);
  assert.match(rating, /Your rating could not be saved/);
  assert.match(ratingActions, /await getAuthSession\(\)/);
  assert.match(
    database,
    /on conflict \(user_id, tmdb_id, media_type, season_number, episode_number\) do update set/
  );
  assert.match(database, /rating = excluded\.rating/);
});

test('public protected actions lead clearly to Login or Register', async () => {
  const page = await read('src/lib/pages/movie/detail/index.tsx');

  assert.match(page, /Log in or register to add this movie/);
  assert.match(
    page,
    /href=\{`\/login\?callbackUrl=\/movie\/\$\{movie\.id\}`\}/
  );
  assert.match(page, /href="\/register"/);
  assert.match(page, />\s*Login\s*</);
  assert.match(page, />\s*Register\s*</);
});

test('movie detail layout has explicit mobile and desktop compositions', async () => {
  const [page, cast] = await Promise.all([
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/pages/movie/detail/components/casts-wrapper.tsx'),
  ]);

  // The poster is a compact column beside the title on every screen size, so
  // the library controls stay above the fold instead of below the artwork.
  assert.match(page, /base: '7\.5rem minmax\(0, 1fr\)'/);
  assert.match(page, /md: '13rem minmax\(0, 1fr\)'/);
  assert.match(page, /base: 'xl', md: '3xl'/);
  assert.match(cast, /base: 'repeat\(2, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /md: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /xl: 'repeat\(6, minmax\(0, 1fr\)\)'/);
});
