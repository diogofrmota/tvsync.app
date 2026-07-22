import { TVSeasonDetailPage } from 'lib/pages/tv/season/detail';
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
      title: `${title} | TVSync`,
      description,
      openGraph: {
        title: `${title} | TVSync`,
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
      title: 'TV season | TVSync',
      description: 'View TV season episodes, progress, and ratings on TVSync.',
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
    const data = await getTVSeasonDetailsServer({
      seasonNumber: tvSeasonNumber,
      showId,
    });

    return <TVSeasonDetailPage data={data} showId={showId} />;
  } catch {
    notFound();
  }
}
