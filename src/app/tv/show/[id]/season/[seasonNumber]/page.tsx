import { getSeasonProgressState } from 'lib/features/tracking/actions';
import { TVSeasonDetailPage } from 'lib/pages/tv/season/detail';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { getTVSeasonDetailsServer } from 'lib/services/tmdb/tv/season/index.server';
import { parsePositiveIntegerRouteParam } from 'lib/utils/route-params';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
const tmdbOriginalImageUrl = 'https://image.tmdb.org/t/p/original';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string }>;
}): Promise<Metadata> {
  const { id, seasonNumber } = await params;
  const showId = parsePositiveIntegerRouteParam(id);
  const tvSeasonNumber = parsePositiveIntegerRouteParam(seasonNumber);

  if (showId === null || tvSeasonNumber === null) {
    return {};
  }

  try {
    const season = await getTVSeasonDetailsServer({
      seasonNumber: tvSeasonNumber,
      showId,
    });
    const title = season.name || `Season ${season.season_number}`;
    const description =
      season.overview || `View episodes, progress, and ratings for ${title}.`;

    return {
      title: `${title} | TvSync`,
      description,
      openGraph: {
        title: `${title} | TvSync`,
        description,
        type: 'video.tv_show',
        url: `/tv/show/${id}/season/${seasonNumber}`,
        images: season.poster_path
          ? [
              {
                url: `${tmdbOriginalImageUrl}${season.poster_path}`,
                alt: `${title} poster`,
              },
            ]
          : undefined,
      },
    };
  } catch {
    return {
      title: 'TV season | TvSync',
      description: 'View TV season episodes, progress, and ratings on TvSync.',
    };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string }>;
}) {
  const { id, seasonNumber } = await params;
  const showId = parsePositiveIntegerRouteParam(id);
  const tvSeasonNumber = parsePositiveIntegerRouteParam(seasonNumber);

  if (showId === null || tvSeasonNumber === null) {
    notFound();
  }

  try {
    const [data, show, progressState] = await Promise.all([
      getTVSeasonDetailsServer({
        seasonNumber: tvSeasonNumber,
        showId,
      }),
      getTvShowDetail(showId).catch(() => null),
      getSeasonProgressState({
        seasonNumber: tvSeasonNumber,
        tmdbShowId: showId,
      }),
    ]);

    return (
      <TVSeasonDetailPage
        data={data}
        initialWatchedEpisodeNumbers={progressState.watchedEpisodeNumbers}
        showId={showId}
        showName={show?.name || show?.original_name || 'Untitled TV show'}
      />
    );
  } catch {
    notFound();
  }
}
