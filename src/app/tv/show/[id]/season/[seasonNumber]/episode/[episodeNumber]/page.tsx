import {
  getEpisodeProgressState,
  getTvProgressSummary,
} from 'lib/features/tracking/actions';
import { TVEpisodeDetailPage } from 'lib/pages/tv/episode/detail';
import { getTvShowDetail } from 'lib/services/tmdb/tv/detail/index.server';
import { getTVEpisodeDetailsServer } from 'lib/services/tmdb/tv/episode/index.server';
import {
  findAdjacentSeasonNumber,
  resolveEpisodeNeighbors,
} from 'lib/services/tmdb/tv/episode/navigation';
import { getTVSeasonDetailsServer } from 'lib/services/tmdb/tv/season/index.server';
import { parsePositiveIntegerRouteParam } from 'lib/utils/route-params';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
const tmdbOriginalImageUrl = 'https://image.tmdb.org/t/p/original';
const crawlerMetadata = {
  robots: { follow: false, index: false },
} satisfies Metadata;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string; episodeNumber: string }>;
}): Promise<Metadata> {
  const { id, seasonNumber, episodeNumber } = await params;
  const showId = parsePositiveIntegerRouteParam(id);
  const tvSeasonNumber = parsePositiveIntegerRouteParam(seasonNumber);
  const tvEpisodeNumber = parsePositiveIntegerRouteParam(episodeNumber);

  if (showId === null || tvSeasonNumber === null || tvEpisodeNumber === null) {
    return crawlerMetadata;
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
      ...crawlerMetadata,
      title: `${title} | TvSync`,
      description,
      openGraph: {
        title: `${title} | TvSync`,
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
      ...crawlerMetadata,
      title: 'TV episode | TvSync',
      description: 'View TV episode progress and ratings on TvSync.',
    };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; seasonNumber: string; episodeNumber: string }>;
}) {
  const { id, seasonNumber, episodeNumber } = await params;
  const showId = parsePositiveIntegerRouteParam(id);
  const tvSeasonNumber = parsePositiveIntegerRouteParam(seasonNumber);
  const tvEpisodeNumber = parsePositiveIntegerRouteParam(episodeNumber);

  if (showId === null || tvSeasonNumber === null || tvEpisodeNumber === null) {
    notFound();
  }

  try {
    const [data, show, currentSeason] = await Promise.all([
      getTVEpisodeDetailsServer({
        episodeNumber: tvEpisodeNumber,
        seasonNumber: tvSeasonNumber,
        showId,
      }),
      getTvShowDetail(showId),
      getTVSeasonDetailsServer({ seasonNumber: tvSeasonNumber, showId }),
    ]);

    const previousSeasonNumber = findAdjacentSeasonNumber(
      show.seasons,
      tvSeasonNumber,
      'previous'
    );
    const nextSeasonNumber = findAdjacentSeasonNumber(
      show.seasons,
      tvSeasonNumber,
      'next'
    );
    const currentIndex = currentSeason.episodes
      .toSorted((left, right) => left.episode_number - right.episode_number)
      .findIndex((episode) => episode.episode_number === tvEpisodeNumber);
    const needsPreviousSeason =
      currentIndex <= 0 && previousSeasonNumber !== null;
    const needsNextSeason =
      currentIndex === currentSeason.episodes.length - 1 &&
      nextSeasonNumber !== null;

    const [previousSeason, nextSeason, progressState, progressSummary] =
      await Promise.all([
        needsPreviousSeason
          ? getTVSeasonDetailsServer({
              seasonNumber: previousSeasonNumber as number,
              showId,
            }).catch(() => null)
          : Promise.resolve(null),
        needsNextSeason
          ? getTVSeasonDetailsServer({
              seasonNumber: nextSeasonNumber as number,
              showId,
            }).catch(() => null)
          : Promise.resolve(null),
        getEpisodeProgressState({
          episodeNumber: tvEpisodeNumber,
          seasonNumber: tvSeasonNumber,
          tmdbShowId: showId,
        }),
        getTvProgressSummary(showId),
      ]);

    const { next, previous } = resolveEpisodeNeighbors({
      currentSeasonEpisodes: currentSeason.episodes,
      currentSeasonNumber: tvSeasonNumber,
      episodeNumber: tvEpisodeNumber,
      nextSeasonEpisodes: nextSeason?.episodes ?? null,
      nextSeasonNumber,
      previousSeasonEpisodes: previousSeason?.episodes ?? null,
      previousSeasonNumber,
    });

    return (
      <TVEpisodeDetailPage
        data={data}
        initialNextEpisode={
          progressSummary.status === 'saved'
            ? progressSummary.nextEpisode
            : null
        }
        initialWatched={progressState.watched}
        next={next}
        previous={previous}
        showName={show.name || show.original_name || 'Untitled TV show'}
      />
    );
  } catch {
    notFound();
  }
}
