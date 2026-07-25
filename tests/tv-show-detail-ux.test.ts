/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirement they protect. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are invoked only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  normalizeTvVideosResponse,
  selectTrustedTvTrailer,
} from '../src/lib/services/tmdb/tv/videos/utils';

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

test('TV show details remain public and load required sections independently', async () => {
  const route = await read('src/app/tv/show/[id]/page.tsx');

  assert.match(route, /getTvShowDetail\(showId\)/);
  assert.match(route, /getTVShowCreditsServer\(showId\)\.catch/);
  assert.match(route, /getTvVideosServer\(showId\)\.catch/);
  assert.match(route, /getTvExternalIdsServer\(showId\)\.catch/);
  assert.doesNotMatch(route, /getSimilarTVShowsServer/);
  assert.doesNotMatch(route, /getTvWatchProvidersServer/);
  assert.doesNotMatch(route, /redirect\(['"]\/login/);
  assert.doesNotMatch(route, /notFound\(\)[\s\S]*getServerSession/);
});

test('TV show page renders required metadata and focused sections in a clear hierarchy', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  // Header first, then the personal controls, then the seasons: episodes are
  // reachable without scrolling past the trailer, cast, and description.
  assertInOrder(page, [
    'poster`}',
    'as="h1"',
    'Release year:',
    'Seasons:',
    'Episodes:',
    'Status:',
    'Genres unavailable',
    '<ImdbRatingPanel',
    'Your TV show',
    '<SeasonsList',
    'Description',
    '<TvTrailer',
    '<TvCastsWrapper',
  ]);
  assert.doesNotMatch(
    page,
    /ReviewsSection|RecommendForm|Recommended TV shows|WatchlistStateButton|MediaStatusControl/i
  );
  assert.doesNotMatch(page, /TvStreamingAvailability|Similar TV shows/);
});

test('missing TV show metadata is represented honestly and IMDb is never backed by TMDB votes', async () => {
  const [page, trailer, seasons, imdbPanel] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/pages/tv/detail/components/trailer.tsx'),
    read('src/lib/pages/tv/detail/components/seasons-list.tsx'),
    read('src/lib/components/shared/ImdbRating.tsx'),
  ]);
  const renderedDetailSources = `${page}\n${trailer}\n${seasons}`;

  for (const fallback of [
    'Untitled TV show',
    "'Unavailable'",
    'Genres unavailable',
    'No description is available from TMDB.',
    'No trusted trailer is available.',
    'TMDB does not have season information for this show yet.',
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
  assert.match(page, /<ImdbRatingPanel imdbId=\{imdbId\}/);
});

test('trailer playback accepts only normalized YouTube trailer identifiers', async () => {
  const component = await read(
    'src/lib/pages/tv/detail/components/trailer.tsx'
  );
  const videos = normalizeTvVideosResponse({
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

  assert.equal(selectTrustedTvTrailer(videos)?.id, 'trailer');
  assert.match(
    component,
    /https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{trailer\.key\}/
  );
  assert.match(component, /allowFullScreen/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|trailer\.url/);
});

test('cast list is shown but no longer links to per-person pages', async () => {
  const [cast, page] = await Promise.all([
    read('src/lib/pages/tv/detail/components/casts-wrapper.tsx'),
    read('src/lib/pages/tv/detail/index.tsx'),
  ]);

  assert.match(page, /<TvCastsWrapper/);
  assert.match(cast, /Cast</);
  assert.match(cast, /\{tvCast\.name\}/);
  assert.doesNotMatch(cast, /\/person\//);
  assert.doesNotMatch(cast, /<Link|href=/);
  assert.doesNotMatch(cast, /next\/link/);
});

test('TV show detail no longer exposes streaming or similar sections', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  assert.doesNotMatch(page, /TvStreamingAvailability/);
  assert.doesNotMatch(page, /Similar TV shows|similarShow|SliderContainer/);
});

test('seasons list shows number, poster, release year, and watched progress with one interaction pattern', async () => {
  const seasons = await read(
    'src/lib/pages/tv/detail/components/seasons-list.tsx'
  );

  assert.match(seasons, /Season \{seasonNumber\}/);
  assert.match(seasons, /getSeasonYear\(season\.air_date\)/);
  assert.match(seasons, /<SeasonProgressBar/);
  assert.match(seasons, /\{watchedCount\} \/ \{episodeCount\} watched/);
  assert.match(
    seasons,
    /season_number > 0[\s\S]*toSorted\(\(left, right\) => left\.season_number - right\.season_number\)/
  );
  assert.match(
    seasons,
    /Specials are tracked on their own season page and are not counted/
  );
  const linkCount = (seasons.match(/<Link/g) ?? []).length;
  assert.equal(
    linkCount,
    1,
    'seasons list should use exactly one navigation pattern per season card'
  );
});

test('seasons expand in place so episodes can be marked from the show page', async () => {
  const [seasons, actions] = await Promise.all([
    read('src/lib/pages/tv/detail/components/seasons-list.tsx'),
    read('src/lib/features/tracking/actions.ts'),
  ]);

  // Expanding a season loads its episodes on demand and each episode toggles
  // its own watched state without leaving the show page.
  assert.match(
    seasons,
    /getSeasonEpisodes\(\{ seasonNumber, tmdbShowId: showId \}\)/
  );
  assert.match(seasons, /await setEpisodeWatched\(/);
  assert.match(seasons, /Hide episodes/);
  assert.match(seasons, /Mark watched/);
  assert.match(actions, /export const getSeasonEpisodes/);
  // One read covers every season's progress instead of one call per season.
  assert.match(actions, /export const getShowSeasonProgress/);
  assert.match(actions, /listOwnEpisodeProgressForShow\(tmdbShowId\)/);
});

test('mark entire season watched and unwatched controls exist and roll back on failure', async () => {
  const controls = await read(
    'src/lib/pages/tv/detail/components/seasons-list.tsx'
  );

  assert.match(controls, /Mark season watched/);
  assert.match(controls, /Mark season unwatched/);
  assert.match(controls, /await setSeasonWatched\(/);
  assert.match(controls, /setWatchedBySeason\(previous\)/);
});

test('one unified authenticated library control adds, updates, removes, and rolls back', async () => {
  const [control, actions] = await Promise.all([
    read('src/lib/features/library/tv-detail-library-control.tsx'),
    read('src/lib/features/library/actions.ts'),
  ]);

  for (const label of [
    'Add to Library',
    'Watching',
    'Planned to Watch',
    'Finished',
    'Current status:',
    'Remove from Library',
  ]) {
    assert.match(control, new RegExp(label));
  }
  assert.match(control, /await updateTvLibraryStatus/);
  assert.match(control, /await removeTvShowFromLibrary/);
  assert.match(control, /setStatus\(previousStatus\)/);
  assert.match(control, /setSelectedStatus\(previousSelectedStatus\)/);
  assert.doesNotMatch(control, /window\.location|location\.reload/);
  assert.match(actions, /status: 'login_required'/);

  const page = await read('src/lib/pages/tv/detail/index.tsx');
  assert.match(page, /<TvDetailLibraryControl/);
  assert.doesNotMatch(page, /<WatchlistStateButton/);
});

test('overall show progress is automatically calculated from watched episodes and displayed', async () => {
  const [page, summary, actions] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/features/tracking/tv-progress-summary.tsx'),
    read('src/lib/features/tracking/actions.ts'),
  ]);

  assert.match(page, /<TvProgressSummary/);
  assert.match(summary, /Watched: \{summary\.watchedEpisodeCount\}/);
  assert.match(summary, /Progress: \{summary\.progressPercent\}%/);
  assert.match(actions, /getAvailableRegularEpisodes/);
  assert.match(
    actions,
    /season\.season_number > 0 && season\.episode_count > 0/
  );
});

test('favourite and personal rating mutations authenticate and reconcile for TV shows', async () => {
  const [favorite, favoriteActions, rating, ratingActions] = await Promise.all([
    read('src/lib/features/profile/favorite-button.tsx'),
    read('src/lib/features/profile/favorite-actions.ts'),
    read('src/lib/features/reviews/rating-input.tsx'),
    read('src/lib/features/reviews/actions.ts'),
  ]);

  assert.match(favorite, /Mark as Favourite/);
  assert.match(favorite, /Remove from Favourites/);
  assert.match(favoriteActions, /status: 'login_required'/);
  assert.match(rating, /await saveRating/);
  assert.match(rating, /setState\(previousState\)/);
  assert.match(ratingActions, /await getAuthSession\(\)/);

  const page = await read('src/lib/pages/tv/detail/index.tsx');
  assert.match(page, /<FavoriteButton mediaType=\{MediaType\.Tv\}/);
  assert.match(
    page,
    /<RatingInput\s+showAverage=\{false\}\s+showReview\s+target=\{\{ mediaType: MediaType\.Tv/
  );
});

test('public protected actions lead clearly to Login or Register', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  assert.match(page, /Log in or register to add this TV show/);
  assert.match(
    page,
    /href=\{`\/login\?callbackUrl=\/tv\/show\/\$\{show\.id\}`\}/
  );
  assert.match(page, /href="\/register"/);
  assert.match(page, />\s*Login\s*</);
  assert.match(page, />\s*Register\s*</);
});

test('TV show detail layout has explicit mobile and desktop compositions', async () => {
  const [page, cast, seasons] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/pages/tv/detail/components/casts-wrapper.tsx'),
    read('src/lib/pages/tv/detail/components/seasons-list.tsx'),
  ]);

  // The poster is a compact column beside the title on every screen size, so
  // the library controls and seasons stay close to the top of the page.
  assert.match(page, /base: '7\.5rem minmax\(0, 1fr\)'/);
  assert.match(page, /md: '13rem minmax\(0, 1fr\)'/);
  assert.match(page, /base: 'xl', md: '3xl'/);
  assert.match(cast, /base: 'repeat\(2, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /md: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /xl: 'repeat\(6, minmax\(0, 1fr\)\)'/);
  assert.match(seasons, /base: '1fr', md: 'repeat\(2, 1fr\)'/);
});
