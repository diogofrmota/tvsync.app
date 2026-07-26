import { MediaReviewsPage } from 'lib/pages/media/reviews';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { getTvReviewsServer } from 'lib/services/tmdb/tv/reviews/index.server';
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
  const showId = parsePositiveIntegerRouteParam(id);

  if (showId === null) {
    notFound();
  }

  try {
    const show = await getTvShowDetail(showId);
    // Reviews are an extra: a failing lookup degrades to an empty list instead
    // of a missing page.
    const reviews = await getTvReviewsServer(showId).catch(() => ({
      id: showId,
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    }));

    return (
      <MediaReviewsPage
        backHref={`/tv/show/${showId}` as Route}
        backLabel="Back to TV Show"
        reviews={reviews.results}
        title={show.name || show.original_name || 'this TV show'}
      />
    );
  } catch {
    notFound();
  }
}
