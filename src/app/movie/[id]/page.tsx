import { MovieDetailPage } from 'lib/pages/movie/detail';
import { getMovieCreditsServer } from 'lib/services/tmdb/movie/credits/index.server';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getMovieRecommendationsServer } from 'lib/services/tmdb/movie/list/index.server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 604_800;
export const dynamic = 'force-static';
const tmdbOriginalImageUrl = 'https://image.tmdb.org/t/p/original';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const movieId = Number(id);

  if (!Number.isFinite(movieId)) {
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
    const movieId = Number(id);

    if (!Number.isFinite(movieId)) {
      notFound();
    }

    const [detailData, creditsData, recommendationsData] = await Promise.all([
      getMovieDetailServer(movieId),
      getMovieCreditsServer(movieId),
      getMovieRecommendationsServer(movieId),
    ]);

    return (
      <MovieDetailPage
        creditsData={creditsData}
        detailData={detailData}
        recommendationsData={recommendationsData}
      />
    );
  } catch {
    notFound();
  }
}
