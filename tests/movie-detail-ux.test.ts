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

  // The header carries the poster, the star rating directly under the title,
  // and every fact; the personal controls come straight after it, and the
  // longer reading sections — director ahead of the cast — close the page.
  assertInOrder(page, [
    'poster`}',
    'as="h1"',
    '<MediaRatingPanel',
    'Release year:',
    'Status:',
    '<GenreList',
    '<MediaDetailActions',
    'Rating',
    '<RatingInput',
    'Description',
    '<MovieTrailer',
    '<MediaCrewSection',
    '<CastsWrapper',
    '<MediaReviews',
  ]);
  // Runtime is no longer one of the facts the header carries.
  assert.doesNotMatch(page, /Runtime|movie\.runtime/);
  // The personal panel is one row of controls, not a bordered "Your movie" box.
  assert.doesNotMatch(page, /Your movie/);
  // The director is no longer a line of text stranded in the header.
  assert.doesNotMatch(page, /Director:/);
  assert.doesNotMatch(
    page,
    /RecommendForm|Recommended movies|Revenue:|gallery/i
  );
  assert.doesNotMatch(page, /StreamingAvailability|Similar movies/);
});

test('missing movie metadata is represented honestly and every score is labelled', async () => {
  const [page, trailer, detailUtils, ratingPanel] = await Promise.all([
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/pages/movie/detail/components/trailer.tsx'),
    read('src/lib/services/tmdb/movie/detail/utils.ts'),
    read('src/lib/components/shared/MediaRating.tsx'),
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

  // The rating is one star and one score: no "/ 10", no source label, no vote
  // count, no age certificate, and no outbound IMDb link. The score itself is
  // the genuine IMDb value when OMDb returns one and the TMDB member score
  // otherwise, and the accessible name still names the source so a TMDB score
  // is never announced as an IMDb one.
  assert.match(ratingPanel, /score\.toFixed\(1\)/);
  assert.match(ratingPanel, /imdbRating\?\.rating \?\? \(hasTmdbScore/);
  assert.match(ratingPanel, /const source = imdbRating \? 'IMDb' : 'TMDB'/);
  assert.match(ratingPanel, /aria-label=\{`\$\{source\} rating/);
  assert.match(ratingPanel, /No rating yet/);
  assert.doesNotMatch(ratingPanel, /\/ 10|votes|View on IMDb|certification/);
  assert.match(page, /voteAverage=\{movie\.vote_average\}/);
  assert.doesNotMatch(
    detailUtils,
    /status: response\?\.status \?\? 'Released'/
  );
});

test('movie member reviews come from TMDB with safe fallbacks and a See All list', async () => {
  const [route, reviewsRoute, reviews, reviewList, page] = await Promise.all([
    read('src/app/movie/[id]/page.tsx'),
    read('src/app/movie/[id]/reviews/page.tsx'),
    read('src/lib/services/tmdb/reviews.ts'),
    read('src/lib/components/shared/MediaReviews.tsx'),
    read('src/lib/pages/movie/detail/index.tsx'),
  ]);

  assert.match(route, /getMovieReviewsServer\(movieId\)\.catch/);
  assert.match(route, /reviews=\{reviews\.results\}/);
  // The age certificate is no longer shown, so the page no longer pays for it.
  assert.doesNotMatch(
    route,
    /getMovieReleaseDatesServer|selectMovieCertification/
  );

  // Review links are only ever TMDB permalinks, and an empty list still renders.
  assert.match(
    reviews,
    /TMDB_REVIEW_URL = 'https:\/\/www\.themoviedb\.org\/review\//
  );
  assert.match(reviews, /url\.startsWith\(TMDB_REVIEW_URL\)/);
  assert.match(reviewList, /No TMDB member has reviewed this title yet\./);
  assert.match(reviewList, /rel="noopener noreferrer"/);

  // "See All" is the section's one action, exactly as every other rail, and it
  // opens the complete list on its own route.
  assert.match(reviewList, /<SectionHeading/);
  assert.match(reviewList, /seeAllHref=\{hasMore && seeAllHref/);
  assert.match(
    page,
    /seeAllHref=\{`\/movie\/\$\{movie\.id\}\/reviews` as Route\}/
  );
  assert.match(reviewsRoute, /getMovieReviewsServer\(movieId\)\.catch/);
  assert.match(reviewsRoute, /<MediaReviewsPage/);
});

test('the movie director leads the credits in the cast section format', async () => {
  const [page, crew] = await Promise.all([
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/components/shared/MediaCrewSection.tsx'),
  ]);

  assert.match(page, /member\.job === 'Director'/);
  assert.match(page, /title="Director"/);
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

test('the movie actions are one Add button that becomes favourite, finished, and remove', async () => {
  const [control, actions, page] = await Promise.all([
    read('src/lib/features/library/media-detail-actions.tsx'),
    read('src/lib/features/library/actions.ts'),
    read('src/lib/pages/movie/detail/index.tsx'),
  ]);

  assert.match(page, /addLabel="Add Movie"/);
  // A saved title carries exactly three controls: the heart, the finished
  // toggle, and the X that removes it again.
  assert.match(control, /aria-label="Remove from your library"/);
  assert.match(control, /'Remove from Favourites' : 'Mark as Favourite'/);
  assert.match(control, /isFinished \? 'Finished' : 'Mark as Finished'/);
  assert.match(control, /FiHeart/);
  assert.match(control, /FiX/);
  // The status select is gone; adding and finishing are the only two states.
  assert.doesNotMatch(control, /NativeSelect|Planned to Watch|Library status/);

  assert.match(control, /await updateMovieLibraryStatus/);
  assert.match(control, /await removeMovieFromLibrary/);
  assert.match(control, /setStatus\(previousStatus\)/);
  assert.match(control, /setFavorite\(previousFavorite\)/);
  assert.doesNotMatch(control, /window\.location|location\.reload/);
  assert.match(actions, /await isAuthenticated\(\)/);
  assert.match(actions, /status: 'login_required'/);
});

test('favourite and personal rating mutations authenticate, reconcile, and support create or update', async () => {
  const [favorite, favoriteActions, rating, ratingActions, database] =
    await Promise.all([
      read('src/lib/features/library/media-detail-actions.tsx'),
      read('src/lib/features/profile/favorite-actions.ts'),
      read('src/lib/features/reviews/rating-input.tsx'),
      read('src/lib/features/reviews/actions.ts'),
      read('src/lib/services/database/tracking.server.ts'),
    ]);

  assert.match(favorite, /Mark as Favourite/);
  assert.match(favorite, /Remove from Favourites/);
  assert.match(favorite, /setFavorite\(!nextFavorite\)/);
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

test('the rating section is ten stars plus a review, on its own subtitle', async () => {
  const [page, stars, input] = await Promise.all([
    read('src/lib/pages/movie/detail/index.tsx'),
    read('src/lib/features/reviews/star-rating.tsx'),
    read('src/lib/features/reviews/rating-input.tsx'),
  ]);

  assert.match(page, /Rating\s*<\/Heading>/);
  assert.match(page, /<RatingInput/);
  // Ten stars, each with a half-point hit area, so the stored 0.5 scale stays
  // reachable from the artwork-free control.
  assert.match(stars, /STAR_VALUES = \[1, 2, 3, 4, 5, 6, 7, 8, 9, 10\]/);
  assert.match(
    stars,
    /aria-label=\{`Rate \$\{value\.toFixed\(1\)\} out of 10`\}/
  );
  assert.match(stars, /FiStar/);
  assert.match(input, /<StarRating/);
  // The dropdown the stars replaced is gone.
  assert.doesNotMatch(input, /NativeSelect|ratingOptions/);
  assert.match(input, /Your review/);
  assert.match(input, /await saveReview/);
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
