import { TVEpisodeDetailPage } from 'lib/pages/tv/episode/detail';
import { getTVEpisodeDetailsServer } from 'lib/services/tmdb/tv/episode/index.server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 604_800;
export const dynamic = 'force-static';
const tmdbOriginalImageUrl = 'https://image.tmdb.org/t/p/original';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string; episodeNumber: string }>;
}): Promise<Metadata> {
  const { id, seasonNumber, episodeNumber } = await params;
  const showId = Number(id);
  const tvSeasonNumber = Number(seasonNumber);
  const tvEpisodeNumber = Number(episodeNumber);

  if (
    !(
      Number.isFinite(showId) &&
      Number.isFinite(tvSeasonNumber) &&
      Number.isFinite(tvEpisodeNumber)
    )
  ) {
    return {};
  }

  try {
    const episode = await getTVEpisodeDetailsServer({
      episodeNumber: tvEpisodeNumber,
      seasonNumber: tvSeasonNumber,
      showId,
    });
    const title = episode.name || `Episode ${episode.episode_number}`;
    const description =
      episode.overview ||
      `View progress and ratings for season ${episode.season_number}, episode ${episode.episode_number}.`;

    return {
      title: `${title} | TVSync`,
      description,
      openGraph: {
        title: `${title} | TVSync`,
        description,
        type: 'video.episode',
        url: `/tv/show/${id}/season/${seasonNumber}/episode/${episodeNumber}`,
        images: episode.still_path
          ? [
              {
                url: `${tmdbOriginalImageUrl}${episode.still_path}`,
                alt: `${title} still`,
              },
            ]
          : undefined,
      },
    };
  } catch {
    return {
      title: 'TV episode | TVSync',
      description: 'View TV episode progress and ratings on TVSync.',
    };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string; episodeNumber: string }>;
}) {
  const { id, seasonNumber, episodeNumber } = await params;
  const showId = Number(id);
  const tvSeasonNumber = Number(seasonNumber);
  const tvEpisodeNumber = Number(episodeNumber);

  if (
    !(
      Number.isFinite(showId) &&
      Number.isFinite(tvSeasonNumber) &&
      Number.isFinite(tvEpisodeNumber)
    )
  ) {
    notFound();
  }

  try {
    const data = await getTVEpisodeDetailsServer({
      episodeNumber: tvEpisodeNumber,
      seasonNumber: tvSeasonNumber,
      showId,
    });

    return <TVEpisodeDetailPage data={data} />;
  } catch {
    notFound();
  }
}
