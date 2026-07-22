export type EpisodeNavigationSeason = {
  episode_count: number;
  season_number: number;
};

export type EpisodeNavigationEpisode = {
  episode_number: number;
};

export type EpisodeNavigationTarget = {
  episodeNumber: number;
  seasonNumber: number;
};

/**
 * Only regular seasons (season_number > 0) with at least one listed episode
 * are valid navigation destinations, matching the app's existing "available
 * episode" convention and the fact that season 0/specials are not routable.
 */
export const findAdjacentSeasonNumber = (
  seasons: ReadonlyArray<EpisodeNavigationSeason>,
  currentSeasonNumber: number,
  direction: 'next' | 'previous'
): number | null => {
  const candidates = seasons
    .filter((season) => season.season_number > 0 && season.episode_count > 0)
    .map((season) => season.season_number)
    .toSorted((left, right) => left - right);

  if (direction === 'next') {
    return (
      candidates.find((seasonNumber) => seasonNumber > currentSeasonNumber) ??
      null
    );
  }

  return (
    candidates
      .toReversed()
      .find((seasonNumber) => seasonNumber < currentSeasonNumber) ?? null
  );
};

export const resolveEpisodeNeighbors = ({
  currentSeasonEpisodes,
  currentSeasonNumber,
  episodeNumber,
  nextSeasonEpisodes,
  nextSeasonNumber,
  previousSeasonEpisodes,
  previousSeasonNumber,
}: {
  currentSeasonEpisodes: ReadonlyArray<EpisodeNavigationEpisode>;
  currentSeasonNumber: number;
  episodeNumber: number;
  nextSeasonEpisodes: ReadonlyArray<EpisodeNavigationEpisode> | null;
  nextSeasonNumber: number | null;
  previousSeasonEpisodes: ReadonlyArray<EpisodeNavigationEpisode> | null;
  previousSeasonNumber: number | null;
}): {
  next: EpisodeNavigationTarget | null;
  previous: EpisodeNavigationTarget | null;
} => {
  const sortedCurrent = [...currentSeasonEpisodes].toSorted(
    (left, right) => left.episode_number - right.episode_number
  );
  const index = sortedCurrent.findIndex(
    (episode) => episode.episode_number === episodeNumber
  );

  let previous: EpisodeNavigationTarget | null = null;
  if (index > 0) {
    previous = {
      episodeNumber: sortedCurrent[index - 1].episode_number,
      seasonNumber: currentSeasonNumber,
    };
  } else if (
    previousSeasonNumber !== null &&
    previousSeasonEpisodes &&
    previousSeasonEpisodes.length > 0
  ) {
    const [last] = [...previousSeasonEpisodes].toSorted(
      (left, right) => right.episode_number - left.episode_number
    );
    previous = {
      episodeNumber: last.episode_number,
      seasonNumber: previousSeasonNumber,
    };
  }

  let next: EpisodeNavigationTarget | null = null;
  if (index !== -1 && index < sortedCurrent.length - 1) {
    next = {
      episodeNumber: sortedCurrent[index + 1].episode_number,
      seasonNumber: currentSeasonNumber,
    };
  } else if (
    nextSeasonNumber !== null &&
    nextSeasonEpisodes &&
    nextSeasonEpisodes.length > 0
  ) {
    const [first] = [...nextSeasonEpisodes].toSorted(
      (left, right) => left.episode_number - right.episode_number
    );
    next = {
      episodeNumber: first.episode_number,
      seasonNumber: nextSeasonNumber,
    };
  }

  return { next, previous };
};
