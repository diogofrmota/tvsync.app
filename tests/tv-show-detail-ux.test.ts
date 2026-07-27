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
  assert.match(route, /getTvReviewsServer\(showId\)\.catch/);
  // The age certificate is no longer shown, so the page no longer pays for it.
  assert.doesNotMatch(route, /getTvContentRatingsServer|selectTvContentRating/);
  assert.doesNotMatch(route, /getSimilarTVShowsServer/);
  assert.doesNotMatch(route, /getTvWatchProvidersServer/);
  assert.doesNotMatch(route, /redirect\(['"]\/login/);
  assert.doesNotMatch(route, /notFound\(\)[\s\S]*getServerSession/);
});

test('TV show page renders required metadata and focused sections in a clear hierarchy', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  // The shared hero first — backdrop, poster, title, year, score, and the
  // personal controls it closes on — then the remaining facts, then the
  // episodes to mark as seen, then the ratings, the description, and the rest:
  // the same order the movie page uses, with the tracker slotted in where a
  // show needs it.
  assertInOrder(page, [
    '<MediaDetailHero',
    '<MediaDetailActions',
    'backdropPath={show.backdrop_path}',
    'posterPath={show.poster_path}',
    "status={show.status || 'Unavailable'}",
    'year={getReleaseYear(show.first_air_date)}',
    '<EpisodeTracker',
    'Review',
    '<RatingInput',
    'Description',
    '<TvTrailer',
    '<MediaCrewSection',
    '<TvCastsWrapper',
    '<MediaReviews',
  ]);
  // The personal panel is one row of controls, not a bordered box.
  assert.doesNotMatch(page, /Your TV Show/);
  assert.doesNotMatch(
    page,
    /Release year:|Seasons:|Episodes:|Status:|Genres unavailable|Runtime/
  );
  assert.doesNotMatch(
    page,
    /RecommendForm|Recommended TV shows|WatchlistStateButton|MediaStatusControl/i
  );
  assert.doesNotMatch(page, /TvStreamingAvailability|Similar TV shows/);
});

test('missing TV show metadata is represented honestly and every score is labelled', async () => {
  const [page, trailer, tracker, ratingPanel, hero] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/pages/tv/detail/components/trailer.tsx'),
    read('src/lib/pages/tv/detail/components/episode-tracker.tsx'),
    read('src/lib/components/shared/MediaRating.tsx'),
    read('src/lib/components/shared/MediaDetailHero.tsx'),
  ]);
  const renderedDetailSources = `${page}\n${trailer}\n${tracker}`;

  for (const fallback of [
    'Untitled TV show',
    "'Unavailable'",
    'No description is available from TMDB.',
    'No trusted trailer is available.',
    'TMDB does not have season information for this show yet.',
    'TMDB does not have episode information for this season yet.',
  ]) {
    assert.match(
      renderedDetailSources,
      new RegExp(fallback.replaceAll('.', '\\.'))
    );
  }

  // The rating is one star and one score: no "/ 10", no source label, no vote
  // count, no age certificate, and no outbound IMDb link.
  assert.match(ratingPanel, /score\.toFixed\(1\)/);
  assert.match(ratingPanel, /No rating yet/);
  assert.doesNotMatch(ratingPanel, /\/ 10|votes|View on IMDb|certification/);
  assert.match(hero, /<MediaRatingPanel/);
  assert.match(page, /voteAverage=\{show\.vote_average\}/);
});

test('TV member reviews come from TMDB with safe fallbacks and a See All list', async () => {
  const [route, reviewsRoute, reviews, page] = await Promise.all([
    read('src/app/tv/show/[id]/page.tsx'),
    read('src/app/tv/show/[id]/reviews/page.tsx'),
    read('src/lib/services/tmdb/tv/reviews/index.server.ts'),
    read('src/lib/pages/tv/detail/index.tsx'),
  ]);

  assert.match(reviews, /\/tv\/\$\{id\}\/reviews/);
  assert.match(reviews, /next:\s*\{\s*revalidate:\s*TMDB_REVALIDATE_SECONDS\./);
  assert.match(route, /reviews: reviews\.results/);

  // "See All" is the section's one action and opens the complete list.
  assert.match(
    page,
    /seeAllHref=\{`\/tv\/show\/\$\{show\.id\}\/reviews` as Route\}/
  );
  assert.match(reviewsRoute, /getTvReviewsServer\(showId\)\.catch/);
  assert.match(reviewsRoute, /<MediaReviewsPage/);
});

test('the TV director leads the credits and falls back to the creators', async () => {
  const [page, crew] = await Promise.all([
    read('src/lib/pages/tv/detail/index.tsx'),
    read('src/lib/components/shared/MediaCrewSection.tsx'),
  ]);

  assert.match(page, /member\.job === 'Director'/);
  assert.match(page, /crewTitle = hasDirectors \? 'Director' : 'Creator'/);
  assert.match(page, /show\.created_by/);
  assert.match(
    page,
    /emptyMessage="No director information is available from TMDB\."/
  );
  // The same avatar grid as the cast section directly below it.
  assert.match(crew, /base: 'repeat\(2, minmax\(0, 1fr\)\)'/);
  assert.match(crew, /md: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.match(crew, /xl: 'repeat\(6, minmax\(0, 1fr\)\)'/);
  assert.match(crew, /<Avatar\.Fallback name=\{person\.name\}/);
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

test('the current season slides left to right with a seen toggle on every episode', async () => {
  const tracker = await read(
    'src/lib/pages/tv/detail/components/episode-tracker.tsx'
  );

  // A horizontal rail of episode cards, opened on the next unseen episode.
  assert.match(tracker, /overflowX="auto"/);
  assert.match(tracker, /scrollSnapType="x proximity"/);
  assert.match(tracker, /<EpisodeCard/);
  assert.match(
    tracker,
    /S\{episode\.seasonNumber\} · E\{episode\.episodeNumber\}/
  );
  assert.match(tracker, /data-next-episode/);
  assert.match(tracker, /Scroll to earlier episodes/);
  assert.match(tracker, /Scroll to later episodes/);
  assert.match(tracker, /\{watched \? 'Seen' : 'Mark as seen'\}/);
  // The rail follows the season being watched: the first with an unseen
  // episode, and the final season once the show is finished.
  assert.match(tracker, /regularSeasons\.find\(/);
  assert.match(
    tracker,
    /\(watchedBySeason\[season\.season_number\] \?\? \[\]\)\.length </
  );
  assert.match(tracker, /\?\? regularSeasons\.at\(-1\)/);
});

test('every season is a dropdown of episode titles that can each be marked seen', async () => {
  const [tracker, actions] = await Promise.all([
    read('src/lib/pages/tv/detail/components/episode-tracker.tsx'),
    read('src/lib/features/tracking/actions.ts'),
  ]);

  // Season rows expand in place; opening one loads its episodes on demand and
  // each episode toggles its own state without leaving the show page.
  assert.match(tracker, /<SeasonDropdown/);
  assert.match(tracker, /aria-expanded=\{isExpanded\}/);
  assert.match(
    tracker,
    /aria-controls=\{`season-\$\{seasonNumber\}-episodes`\}/
  );
  assert.match(
    tracker,
    /getSeasonEpisodes\(\{ seasonNumber, tmdbShowId: showId \}\)/
  );
  assert.match(tracker, /await setEpisodeWatched\(/);
  assert.match(tracker, /\{episode\.episodeNumber\}\. \{episode\.name\}/);
  assert.match(tracker, /\{watchedCount\} \/ \{episodeCount\} seen/);
  assert.match(
    tracker,
    /season_number > 0[\s\S]*toSorted\(\(left, right\) => left\.season_number - right\.season_number\)/
  );
  assert.match(actions, /export const getSeasonEpisodes/);
  // One read covers every season's progress instead of one call per season.
  assert.match(actions, /export const getShowSeasonProgress/);
  assert.match(actions, /listOwnEpisodeProgressForShow\(tmdbShowId\)/);
  // The slider needs the still and the season of each episode.
  assert.match(actions, /stillPath: episode\.still_path/);
  assert.match(actions, /seasonNumber,/);
});

test('the whole-season toggle exists and rolls back on failure', async () => {
  const tracker = await read(
    'src/lib/pages/tv/detail/components/episode-tracker.tsx'
  );

  assert.match(tracker, /Mark season seen/);
  assert.match(tracker, /Mark season unseen/);
  assert.match(tracker, /await setSeasonWatched\(/);
  assert.match(tracker, /setWatchedBySeason\(previous\)/);
});

test('the TV actions are the same Add, favourite, finished, and remove row as movies', async () => {
  const [control, actions] = await Promise.all([
    read('src/lib/features/library/media-detail-actions.tsx'),
    read('src/lib/features/library/actions.ts'),
  ]);

  assert.match(control, /'Remove from Favourites' : 'Mark as Favourite'/);
  assert.match(control, /isFinished \? 'Finished' : 'Mark as Finished'/);
  assert.match(control, /\{removeLabel\}/);
  // A show that is un-finished goes back to Watching rather than to Planned,
  // because its episode progress is still there.
  assert.match(control, /unfinished: WatchStatus\.Watching/);
  assert.match(control, /await updateTvLibraryStatus/);
  assert.match(control, /await removeTvShowFromLibrary/);
  assert.match(control, /setStatus\(previousStatus\)/);
  assert.doesNotMatch(control, /window\.location|location\.reload/);
  assert.doesNotMatch(control, /NativeSelect|Library status/);
  assert.match(actions, /status: 'login_required'/);

  const page = await read('src/lib/pages/tv/detail/index.tsx');
  assert.match(page, /addLabel="Add TV Show"/);
  assert.match(page, /removeLabel="Remove TV Show"/);
  assert.doesNotMatch(page, /<WatchlistStateButton/);
});

test('overall show progress is automatically calculated from watched episodes and displayed', async () => {
  const [tracker, actions] = await Promise.all([
    read('src/lib/pages/tv/detail/components/episode-tracker.tsx'),
    read('src/lib/features/tracking/actions.ts'),
  ]);

  // Progress is counted from the stored episode rows and shown once, on the
  // tracker, instead of being repeated in a separate summary panel.
  assert.match(
    tracker,
    /\{watchedEpisodeCount\} of \{totalEpisodeCount\} episodes seen/
  );
  assert.match(tracker, /<ProgressBar total=\{totalEpisodeCount\}/);
  assert.match(tracker, /percent >= 100 \? 'green\.400' : 'gold\.400'/);
  assert.match(tracker, /getShowSeasonProgress\(showId\)/);
  assert.match(actions, /getAvailableRegularEpisodes/);
  assert.match(
    actions,
    /season\.season_number > 0 && season\.episode_count > 0/
  );
});

test('favourite and personal rating mutations authenticate and reconcile for TV shows', async () => {
  const [favorite, favoriteActions, rating, ratingActions] = await Promise.all([
    read('src/lib/features/library/media-detail-actions.tsx'),
    read('src/lib/features/profile/favorite-actions.ts'),
    read('src/lib/features/reviews/rating-input.tsx'),
    read('src/lib/features/reviews/actions.ts'),
  ]);

  assert.match(favorite, /Mark as Favourite/);
  assert.match(favorite, /Remove from Favourites/);
  assert.match(favoriteActions, /status: 'login_required'/);
  assert.match(rating, /await saveRating/);
  assert.match(rating, /setState\(previousState\)/);
  assert.match(rating, /inputMode="decimal"/);
  assert.match(ratingActions, /await getAuthSession\(\)/);

  const page = await read('src/lib/pages/tv/detail/index.tsx');
  assert.match(page, /<MediaDetailActions\s+addLabel="Add TV Show"/);
  assert.match(
    page,
    /<RatingInput\s+showAverage=\{false\}\s+showReview\s+target=\{\{ mediaType: MediaType\.Tv/
  );
});

test('public protected actions lead clearly to Login or Register', async () => {
  const page = await read('src/lib/pages/tv/detail/index.tsx');

  assert.match(page, /Log in or register to add this TV Show/);
  assert.match(
    page,
    /href=\{`\/login\?callbackUrl=\/tv\/show\/\$\{show\.id\}`\}/
  );
  assert.match(page, /href="\/register"/);
  assert.match(page, />\s*Login\s*</);
  assert.match(page, />\s*Register\s*</);
});

test('TV show detail layout has explicit mobile and desktop compositions', async () => {
  const [hero, cast, tracker] = await Promise.all([
    read('src/lib/components/shared/MediaDetailHero.tsx'),
    read('src/lib/pages/tv/detail/components/casts-wrapper.tsx'),
    read('src/lib/pages/tv/detail/components/episode-tracker.tsx'),
  ]);

  // The poster is a compact column beside the title on every screen size, so
  // the library controls and seasons stay close to the top of the page.
  assert.match(hero, /base: '7\.5rem minmax\(0, 1fr\)'/);
  assert.match(hero, /md: '13rem minmax\(0, 1fr\)'/);
  assert.match(hero, /base: '2xl', md: '4xl'/);
  assert.match(cast, /base: 'repeat\(2, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /md: 'repeat\(4, minmax\(0, 1fr\)\)'/);
  assert.match(cast, /xl: 'repeat\(6, minmax\(0, 1fr\)\)'/);
  assert.match(tracker, /width=\{\{ base: '13rem', md: '15rem' \}\}/);
});
