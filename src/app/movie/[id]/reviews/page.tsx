import { MediaReviewsPage } from 'lib/pages/media/reviews';
import { getMovieDetailServer } from 'lib/services/tmdb/movie/detail/index.server';
import { getMovieReviewsServer } from 'lib/services/tmdb/movie/reviews/index.server';
import { parsePositiveIntegerRouteParam } from 'lib/utils/route-params';
import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'TvSync | Reviews' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = parsePositiveIntegerRouteParam(id);

  if (movieId === null) {
    notFound();
  }

  try {
    const movie = await getMovieDetailServer(movieId);
    // Reviews are an extra: a failing lookup degrades to an empty list instead
    // of a missing page.
    const reviews = await getMovieReviewsServer(movieId).catch(() => ({
      id: movieId,
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    }));

    return (
      <MediaReviewsPage
        backHref={`/movie/${movieId}` as Route}
        backLabel="Back to Movie"
        reviews={reviews.results}
        title={movie.title || movie.original_title || 'this movie'}
      />
    );
  } catch {
    notFound();
  }
}
