import { MovieDetailPage } from 'lib/pages/movie/detail';
import { isMovieDetailViewerAuthenticated } from 'lib/pages/movie/detail/load-viewer.server';
import { getImdbRatingServer } from 'lib/services/omdb/index.server';
import { getMovieCreditsServer } from 'lib/services/tmdb/movie/credits/index.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getMovieReleaseDatesServer } from 'lib/services/tmdb/movie/release-dates/index.server';
import { selectMovieCertification } from 'lib/services/tmdb/movie/release-dates/utils';
import { getMovieReviewsServer } from 'lib/services/tmdb/movie/reviews/index.server';
import { getMovieVideosServer } from 'lib/services/tmdb/movie/videos/index.server';
import { selectTrustedMovieTrailer } from 'lib/services/tmdb/movie/videos/utils';
import { parsePositiveIntegerRouteParam } from 'lib/utils/route-params';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
const tmdbOriginalImageUrl = 'https://image.tmdb.org/t/p/original';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const movieId = parsePositiveIntegerRouteParam(id);

  if (movieId === null) {
    return {};
  }

  try {
    const movie = await getMovieDetailServer(movieId);
    const title = movie.title || movie.original_title || 'Movie';
    const description =
      movie.overview ||
      `View details, cast, recommendations, and tracking for ${title}.`;
    const imagePath = movie.backdrop_path ?? movie.poster_path;

    return {
      title: `TvSync | ${title}`,
      description,
      openGraph: {
        title: `TvSync | ${title}`,
        description,
        type: 'video.movie',
        url: `/movie/${id}`,
        images: imagePath
          ? [
              {
                url: `${tmdbOriginalImageUrl}${imagePath}`,
                alt: `${title} artwork`,
              },
            ]
          : undefined,
      },
    };
  } catch {
    return {
      title: 'TvSync | Movie',
      description:
        'View movie details, cast, recommendations, and tracking on TvSync.',
    };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  try {
    const movieId = parsePositiveIntegerRouteParam(id);

    if (movieId === null) {
      notFound();
    }

    const detailData = await getMovieDetailServer(movieId);
    // The age certificate, reviews, and the optional IMDb score are extras: a
    // failing lookup degrades to an omitted value instead of a missing page.
    const [
      creditsData,
      videosData,
      releaseDates,
      reviews,
      imdbRating,
      session,
    ] = await Promise.all([
      getMovieCreditsServer(movieId).catch(() => ({
        cast: [],
        crew: [],
        id: movieId,
      })),
      getMovieVideosServer(movieId).catch(() => ({
        id: movieId,
        results: [],
      })),
      getMovieReleaseDatesServer(movieId).catch(() => ({
        id: movieId,
        results: [],
      })),
      getMovieReviewsServer(movieId).catch(() => ({
        id: movieId,
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      })),
      getImdbRatingServer(detailData.imdb_id),
      isMovieDetailViewerAuthenticated(),
    ]);

    return (
      <MovieDetailPage
        certification={selectMovieCertification(releaseDates)}
        creditsData={creditsData}
        detailData={detailData}
        imdbRating={imdbRating}
        isAuthenticated={session}
        reviews={reviews.results}
        trailer={selectTrustedMovieTrailer(videosData)}
      />
    );
  } catch {
    notFound();
  }
}
