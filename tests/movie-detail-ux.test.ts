/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirement they protect. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are invoked only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { normalizeMovieWatchProvidersResponse } from '../src/lib/services/tmdb/movie/providers/utils';
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

test('movie details remain public and load required provider sections independently', async () => {
  const route = await read('src/app/movie/[id]/page.tsx');

  assert.match(route, /getMovieDetailServer\(movieId\)/);
  assert.match(route, /getMovieCreditsServer\(movieId\)\.catch/);
  assert.match(route, /getSimilarMoviesServer\(movieId\)\.catch/);
  assert.match(route, /getMovieVideosServer\(movieId\)\.catch/);
  assert.match(route, /getMovieWatchProvidersServer\(movieId\)\.catch/);
  assert.doesNotMatch(route, /redirect\(['"]\/login/);
  assert.doesNotMatch(route, /notFound\(\)[\s\S]*getServerSession/);
});

test('movie page renders required metadata and focused sections in a clear hierarchy', async () => {
  const page = await read('src/lib/pages/movie/detail/index.tsx');

  assertInOrder(page, [
    'poster`}',
    'as="h1"',
    'Release year:',
    'Runtime:',
    'Status:',
    '<GenreList',
    'IMDb rating',
    'Description',
    'Your movie',
    '<MovieTrailer',
    'Director',
    '<CastsWrapper',
    '<StreamingAvailability',
    'Similar movies',
  ]);
  assert.doesNotMatch(
    page,
    /ReviewsSection|RecommendForm|Recommended movies|Revenue:|gallery/i
  );
});

test('missing movie metadata is represented honestly and IMDb is never backed by TMDB votes', async () => {
  const [page, trailer, streaming, detailUtils] = await Promise.all([
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/pages/movie/detail/components/trailer.tsx'),
    read('src/lib/pages/movie/detail/components/streaming-availability.tsx'),
    read('src/lib/services/tmdb/movie/detail/utils.ts'),
  ]);
  const renderedDetailSources = `${page}\n${trailer}\n${streaming}`;

  for (const fallback of [
    'Untitled movie',
    "'Unavailable'",
    'Genres unavailable',
    'No description is available from TMDB.',
    'No trusted trailer is available.',
    'No streaming availability is listed for this region.',
    'TMDB does not list similar movies for this title yet.',
  ]) {
    assert.match(
      renderedDetailSources,
      new RegExp(fallback.replaceAll('.', '\\.'))
    );
  }

  assert.match(page, /IMDb rating[\s\S]*Unavailable/);
  assert.match(page, /not\s+a\s+genuine IMDb rating value/);
  assert.doesNotMatch(page, /vote_average|TMDB rating/);
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

test('cast and true similar-movie navigation use correct detail routes', async () => {
  const [cast, page, service] = await Promise.all([
    read('src/lib/pages/movie/detail/components/casts-wrapper.tsx'),
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/services/tmdb/movie/list/index.server.ts'),
  ]);

  assert.match(cast, /href=\{`\/person\/\$\{movieCast\.id\}`\}/);
  assert.match(cast, /View \$\{movieCast\.name\}/);
  assert.match(service, /path: `\/movie\/\$\{id\}\/similar`/);
  assert.match(page, /sectionTitle="Similar movies"/);
  assert.match(page, /mediaType=\{MediaType\.Movie\}/);
  assert.match(page, /id=\{similarMovie\.id\}/);
});

test('streaming availability is region-scoped and normalized without invented providers', async () => {
  const providers = normalizeMovieWatchProvidersResponse({
    id: 10,
    results: {
      US: {
        ads: [],
        buy: [],
        flatrate: [
          {
            displayPriority: 2,
            logoPath: null,
            providerId: 8,
            providerName: 'Example',
          },
        ],
        free: [],
        link: 'https://www.themoviedb.org/movie/10/watch?locale=US',
        rent: [],
      },
    },
  });
  const [route, component, env] = await Promise.all([
    read('src/app/movie/[id]/page.tsx'),
    read('src/lib/pages/movie/detail/components/streaming-availability.tsx'),
    read('.env.example'),
  ]);

  assert.equal(providers.results.US?.flatrate[0]?.providerName, 'Example');
  assert.match(route, /process\.env\.TMDB_WATCH_REGION/);
  assert.match(route, /providersData\.results\[streamingRegion\]/);
  assert.match(component, /Availability for region \{region\}/);
  assert.match(component, /JustWatch\s+via TMDB/);
  assert.match(env, /TMDB_WATCH_REGION=US/);

  const unsafeProviders = normalizeMovieWatchProvidersResponse({
    id: 10,
    results: {
      US: {
        ads: [],
        buy: [],
        flatrate: [],
        free: [],
        link: 'javascript:alert(1)',
        rent: [],
      },
    },
  });
  assert.equal(unsafeProviders.results.US?.link, '');
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
  assert.match(ratingActions, /await getServerSession\(authOptions\)/);
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

  assert.match(page, /base: 'minmax\(0, 1fr\)'/);
  assert.match(page, /md: '18rem minmax\(0, 1fr\)'/);
  assert.match(page, /base: '3xl', md: '5xl'/);
  assert.match(cast, /base: 'repeat\(2, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /md: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /xl: 'repeat\(6, minmax\(0, 1fr\)\)'/);
});
