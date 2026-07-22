import { MovieDetailPage } from 'lib/pages/movie/detail';
import { isMovieDetailViewerAuthenticated } from 'lib/pages/movie/detail/load-viewer.server';
import { getMovieCreditsServer } from 'lib/services/tmdb/movie/credits/index.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getSimilarMoviesServer } from 'lib/services/tmdb/movie/list/index.server';
import { getMovieWatchProvidersServer } from 'lib/services/tmdb/movie/providers/index.server';
import type { MovieWatchProvidersResponse } from 'lib/services/tmdb/movie/providers/types';
import { normalizeWatchRegion } from 'lib/services/tmdb/movie/providers/utils';
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
      title: `${title} | TVSync`,
      description,
      openGraph: {
        title: `${title} | TVSync`,
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
      title: 'Movie | TVSync',
      description:
        'View movie details, cast, recommendations, and tracking on TVSync.',
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
    const streamingRegion = normalizeWatchRegion(process.env.TMDB_WATCH_REGION);
    const [creditsData, similarData, videosData, providersData, session] =
      await Promise.all([
        getMovieCreditsServer(movieId).catch(() => ({
          cast: [],
          crew: [],
          id: movieId,
        })),
        getSimilarMoviesServer(movieId).catch(() => ({
          dates: { maximum: '', minimum: '' },
          page: 1,
          results: [],
          total_pages: 0,
          total_results: 0,
        })),
        getMovieVideosServer(movieId).catch(() => ({
          id: movieId,
          results: [],
        })),
        getMovieWatchProvidersServer(movieId).catch(
          (): MovieWatchProvidersResponse => ({
            id: movieId,
            results: {},
          })
        ),
        isMovieDetailViewerAuthenticated(),
      ]);

    return (
      <MovieDetailPage
        creditsData={creditsData}
        detailData={detailData}
        isAuthenticated={session}
        similarData={similarData}
        streamingProviders={providersData.results[streamingRegion] ?? null}
        streamingRegion={streamingRegion}
        trailer={selectTrustedMovieTrailer(videosData)}
      />
    );
  } catch {
    notFound();
  }
}
