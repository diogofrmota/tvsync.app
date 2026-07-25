import TvShowDetailPage, {
  type TvShowDetailPageProps,
} from 'lib/pages/tv/detail';
import { isTvShowDetailViewerAuthenticated } from 'lib/pages/tv/detail/load-viewer.server';
import { getImdbRatingServer } from 'lib/services/omdb/index.server';
import { getTvContentRatingsServer } from 'lib/services/tmdb/tv/content-ratings/index.server';
import { selectTvContentRating } from 'lib/services/tmdb/tv/content-ratings/utils';
import { getTVShowCreditsServer } from 'lib/services/tmdb/tv/credits/index.server';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { getTvExternalIdsServer } from 'lib/services/tmdb/tv/external-ids/index.server';
import { getTvReviewsServer } from 'lib/services/tmdb/tv/reviews/index.server';
import { getTvVideosServer } from 'lib/services/tmdb/tv/videos/index.server';
import { selectTrustedTvTrailer } from 'lib/services/tmdb/tv/videos/utils';
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
  const showId = parsePositiveIntegerRouteParam(id);

  if (showId === null) {
    return {};
  }

  try {
    const show = await getTvShowDetail(showId);
    const title = show.name || show.original_name || 'TV Show';
    const description =
      show.overview ||
      `View seasons, cast, progress, and tracking for ${title}.`;
    const imagePath = show.backdrop_path ?? show.poster_path;

    return {
      title: `TvSync | ${title}`,
      description,
      openGraph: {
        title: `TvSync | ${title}`,
        description,
        type: 'video.tv_show',
        url: `/tv/show/${id}`,
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
      title: 'TvSync | TV Show',
      description:
        'View TV show details, seasons, progress, and tracking on TvSync.',
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
    const showId = parsePositiveIntegerRouteParam(id);

    if (showId === null) {
      notFound();
    }

    const data = await getTvShowDetail(showId);
    // The age certificate, reviews, and the optional IMDb score are extras: a
    // failing lookup degrades to an omitted value instead of a missing page.
    const [
      creditsData,
      videosData,
      externalIds,
      contentRatings,
      reviews,
      isAuthenticated,
    ] = await Promise.all([
      getTVShowCreditsServer(showId).catch(() => ({
        cast: [],
        crew: [],
        id: showId,
      })),
      getTvVideosServer(showId).catch(() => ({ id: showId, results: [] })),
      getTvExternalIdsServer(showId).catch(() => ({
        id: showId,
        imdb_id: null,
      })),
      getTvContentRatingsServer(showId).catch(() => ({
        id: showId,
        results: [],
      })),
      getTvReviewsServer(showId).catch(() => ({
        id: showId,
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      })),
      isTvShowDetailViewerAuthenticated(),
    ]);

    const props: TvShowDetailPageProps = {
      certification: selectTvContentRating(contentRatings),
      creditsData,
      data,
      imdbId: externalIds.imdb_id,
      imdbRating: await getImdbRatingServer(externalIds.imdb_id),
      isAuthenticated,
      reviews: reviews.results,
      trailer: selectTrustedTvTrailer(videosData),
    };

    return <TvShowDetailPage {...props} />;
  } catch {
    notFound();
  }
}
