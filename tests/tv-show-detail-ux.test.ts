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
  assert.match(route, /getTvVideosServer\(showId\)\.catch/);
  assert.match(route, /getTvExternalIdsServer\(showId\)\.catch/);
  assert.doesNotMatch(route, /getTVShowCreditsServer/);
  assert.doesNotMatch(route, /getSimilarTVShowsServer/);
  assert.doesNotMatch(route, /getTvWatchProvidersServer/);
  assert.doesNotMatch(route, /redirect\(['"]\/login/);
  assert.doesNotMatch(route, /notFound\(\)[\s\S]*getServerSession/);
});

test('TV show page renders required metadata and focused sections in a clear hierarchy', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  assertInOrder(page, [
    'poster`}',
    'as="h1"',
    'Release year:',
    'Seasons:',
    'Episodes:',
    'Status:',
    'Genres unavailable',
    'IMDb rating',
    'Description',
    'Your TV show',
    '<TvTrailer',
    '<SeasonsList',
  ]);
  assert.doesNotMatch(
    page,
    /ReviewsSection|RecommendForm|Recommended TV shows|WatchlistStateButton|MediaStatusControl/i
  );
  assert.doesNotMatch(
    page,
    /TvCastsWrapper|TvStreamingAvailability|Similar TV shows/
  );
});

test('missing TV show metadata is represented honestly and IMDb is never backed by TMDB votes', async () => {
  const [page, trailer, seasons] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/pages/tv/detail/components/trailer.tsx'),
    read('src/lib/pages/tv/detail/components/seasons-list.tsx'),
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

  assert.match(page, /IMDb rating[\s\S]*Unavailable/);
  assert.match(page, /not\s+a\s+genuine IMDb rating value/);
  assert.doesNotMatch(page, /vote_average|TMDB rating/);
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

test('TV show detail no longer exposes cast, streaming, or similar sections', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  assert.doesNotMatch(page, /\/person\//);
  assert.doesNotMatch(page, /TvCastsWrapper/);
  assert.doesNotMatch(page, /TvStreamingAvailability/);
  assert.doesNotMatch(page, /Similar TV shows|similarShow|SliderContainer/);
});

test('seasons list shows number, poster, release year, and watched progress with one interaction pattern', async () => {
  const seasons = await read(
    'src/lib/pages/tv/detail/components/seasons-list.tsx'
  );

  assert.match(seasons, /Season \{season\.season_number\}/);
  assert.match(seasons, /getSeasonYear\(season\.air_date\)/);
  assert.match(seasons, /<SeasonProgressControls/);
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

test('mark entire season watched and unwatched controls exist and roll back on failure', async () => {
  const controls = await read(
    'src/lib/features/tracking/season-progress-controls.tsx'
  );

  assert.match(controls, /Mark season watched/);
  assert.match(controls, /Mark season unwatched/);
  assert.match(controls, /await setSeasonWatched/);
  assert.match(controls, /setWatchedCount\(previousWatchedCount\)/);
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
  const [page, seasons] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/pages/tv/detail/components/seasons-list.tsx'),
  ]);

  assert.match(page, /base: 'minmax\(0, 1fr\)'/);
  assert.match(page, /md: '18rem minmax\(0, 1fr\)'/);
  assert.match(page, /base: '3xl', md: '5xl'/);
  assert.match(seasons, /base: '1fr', md: 'repeat\(2, 1fr\)'/);
});
