'use client';

import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react';
import PosterImage from 'lib/components/shared/PosterImage';
import {
  getSeasonEpisodes,
  getShowSeasonProgress,
  type SeasonEpisodeSummary,
  setEpisodeWatched,
  setSeasonWatched,
} from 'lib/features/tracking/actions';
import type { Season } from 'lib/services/tmdb/tv/detail/types';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';

type SeasonsListProps = {
  seasons: Array<Season>;
  showId: number;
};

type EpisodesBySeason = Record<number, Array<SeasonEpisodeSummary>>;
type WatchedBySeason = Record<number, Array<number>>;

const formatEpisodeCount = (count: number) =>
  count === 1 ? '1 episode' : `${count} episodes`;

const getSeasonYear = (airDate: string) => {
  const year = airDate ? new Date(airDate).getUTCFullYear() : Number.NaN;

  return Number.isFinite(year) ? String(year) : 'Release year unavailable';
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

const withoutEpisode = (watched: Array<number>, episodeNumber: number) =>
  watched.filter((number) => number !== episodeNumber);

const withEpisode = (watched: Array<number>, episodeNumber: number) =>
  watched.includes(episodeNumber) ? watched : [...watched, episodeNumber];

/**
 * A thin progress bar mirrors the poster bars used across the app: yellow while
 * a season is in progress, green once every episode is watched.
 */
const SeasonProgressBar = ({
  episodeCount,
  watchedCount,
}: {
  episodeCount: number;
  watchedCount: number;
}) => {
  const percent =
    episodeCount > 0
      ? Math.min(100, Math.round((watchedCount / episodeCount) * 100))
      : 0;

  return (
    <Box background="bg.muted" borderRadius="full" height="4px" width="full">
      <Box
        background={percent >= 100 ? 'green.400' : 'gold.400'}
        borderRadius="full"
        height="full"
        transitionDuration="moderate"
        transitionProperty="width, background"
        transitionTimingFunction="ease-out"
        width={`${percent}%`}
      />
    </Box>
  );
};

const EpisodeRow = ({
  episode,
  isPending,
  onToggle,
  watched,
}: {
  episode: SeasonEpisodeSummary;
  isPending: boolean;
  onToggle: () => void;
  watched: boolean;
}) => (
  <Flex
    align="center"
    borderColor={watched ? 'gold.400' : 'border'}
    borderRadius={6}
    borderWidth="1px"
    gap={3}
    justify="space-between"
    paddingX={3}
    paddingY={2}
  >
    <Stack gap={0} minWidth={0}>
      <Text fontSize="sm" fontWeight="600" lineClamp={1}>
        {episode.episodeNumber}. {episode.name}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        {episode.airDate || 'Air date unavailable'}
        {episode.runtime > 0 ? ` · ${episode.runtime} min` : ''}
      </Text>
    </Stack>
    <Button
      aria-label={
        watched
          ? `Mark episode ${episode.episodeNumber} unwatched`
          : `Mark episode ${episode.episodeNumber} watched`
      }
      aria-pressed={watched}
      flexShrink={0}
      loading={isPending}
      onClick={onToggle}
      size="xs"
      variant={watched ? 'solid' : 'outline'}
    >
      <Icon as={FiCheck} />
      {watched ? 'Watched' : 'Mark watched'}
    </Button>
  </Flex>
);

const SeasonEpisodes = ({
  episodes,
  isLoading,
  isPending,
  onToggleEpisode,
  watchedEpisodeNumbers,
}: {
  episodes: Array<SeasonEpisodeSummary>;
  isLoading: boolean;
  isPending: boolean;
  onToggleEpisode: (episodeNumber: number) => void;
  watchedEpisodeNumbers: Array<number>;
}) => {
  if (isLoading) {
    return (
      <Text color="fg.muted" fontSize="sm" role="status">
        Loading episodes…
      </Text>
    );
  }

  if (episodes.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        TMDB does not have episode information for this season yet.
      </Text>
    );
  }

  return (
    <Stack gap={2} maxHeight="22rem" overflowY="auto">
      {episodes.map((episode) => (
        <EpisodeRow
          episode={episode}
          isPending={isPending}
          key={episode.episodeNumber}
          onToggle={() => onToggleEpisode(episode.episodeNumber)}
          watched={watchedEpisodeNumbers.includes(episode.episodeNumber)}
        />
      ))}
    </Stack>
  );
};

const SeasonCard = ({
  episodes,
  isExpanded,
  isLoadingEpisodes,
  isPending,
  onSetWholeSeason,
  onToggleEpisode,
  onToggleExpanded,
  season,
  showId,
  watchedEpisodeNumbers,
}: {
  episodes: Array<SeasonEpisodeSummary>;
  isExpanded: boolean;
  isLoadingEpisodes: boolean;
  isPending: boolean;
  onSetWholeSeason: (watched: boolean, episodeCount: number) => void;
  onToggleEpisode: (episodeNumber: number) => void;
  onToggleExpanded: () => void;
  season: Season;
  showId: number;
  watchedEpisodeNumbers: Array<number>;
}) => {
  const seasonNumber = season.season_number;
  const episodeCount =
    episodes.length > 0 ? episodes.length : season.episode_count;
  const watchedCount = watchedEpisodeNumbers.length;

  return (
    <Stack
      borderColor="border"
      borderRadius={8}
      borderWidth="1px"
      gap={3}
      padding={3}
    >
      <Link
        href={`/tv/show/${showId}/season/${seasonNumber}` as Route}
        prefetch={false}
      >
        <Grid gap={3} templateColumns="56px minmax(0, 1fr)">
          <AspectRatio ratio={3.6 / 5} width="56px">
            <PosterImage
              alt={`${season.name || `Season ${seasonNumber}`} poster`}
              borderRadius={6}
              src={season.poster_path}
              width="56px"
            />
          </AspectRatio>

          <Grid alignContent="start" gap={1}>
            <Flex alignItems="center" gap={2} wrap="wrap">
              <Heading fontSize="md">{season.name}</Heading>
              <Badge variant="outline">Season {seasonNumber}</Badge>
            </Flex>
            <Text color="fg.muted" fontSize="sm">
              {getSeasonYear(season.air_date)} ·{' '}
              {episodeCount > 0
                ? formatEpisodeCount(episodeCount)
                : 'Episode count unavailable'}
            </Text>
          </Grid>
        </Grid>
      </Link>

      {season.episode_count > 0 ? (
        <Stack gap={2}>
          <Flex align="center" gap={3} justify="space-between">
            <Text color="fg.muted" fontSize="sm">
              {watchedCount} / {episodeCount} watched
            </Text>
            <Button onClick={onToggleExpanded} size="xs" variant="ghost">
              {isExpanded ? 'Hide episodes' : 'Episodes'}
              <Icon as={isExpanded ? FiChevronUp : FiChevronDown} />
            </Button>
          </Flex>

          <SeasonProgressBar
            episodeCount={episodeCount}
            watchedCount={watchedCount}
          />

          <Flex gap={2} wrap="wrap">
            <Button
              loading={isPending}
              onClick={() => onSetWholeSeason(true, episodeCount)}
              size="xs"
            >
              Mark season watched
            </Button>
            <Button
              loading={isPending}
              onClick={() => onSetWholeSeason(false, episodeCount)}
              size="xs"
              variant="outline"
            >
              Mark season unwatched
            </Button>
          </Flex>

          {isExpanded ? (
            <SeasonEpisodes
              episodes={episodes}
              isLoading={isLoadingEpisodes}
              isPending={isPending}
              onToggleEpisode={onToggleEpisode}
              watchedEpisodeNumbers={watchedEpisodeNumbers}
            />
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
};

/**
 * Seasons sit directly under the show header so episodes are reachable without
 * scrolling to the bottom of the page: every season shows its progress, can be
 * marked watched as a whole, and expands in place to tick off single episodes.
 */
export const SeasonsList = ({ seasons, showId }: SeasonsListProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [watchedBySeason, setWatchedBySeason] = useState<WatchedBySeason>({});
  const [episodesBySeason, setEpisodesBySeason] = useState<EpisodesBySeason>(
    {}
  );
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [loadingSeason, setLoadingSeason] = useState<number | null>(null);
  const [pendingSeason, setPendingSeason] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleSeasons = seasons
    .filter((season) => season.season_number > 0)
    .toSorted((left, right) => left.season_number - right.season_number);
  const specialsSeason = seasons.find((season) => season.season_number === 0);

  useEffect(() => {
    let isMounted = true;

    getShowSeasonProgress(showId).then((result) => {
      if (!isMounted || result.status !== 'saved') {
        return;
      }

      setWatchedBySeason(
        Object.fromEntries(
          result.seasons.map((season) => [
            season.seasonNumber,
            season.watchedEpisodeNumbers,
          ])
        )
      );
    });

    return () => {
      isMounted = false;
    };
  }, [showId]);

  const handleLoginRequired = () => {
    router.push(getLoginHref(pathname, searchParams));
  };

  const toggleSeason = (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }

    setExpandedSeason(seasonNumber);

    if (episodesBySeason[seasonNumber]) {
      return;
    }

    setLoadingSeason(seasonNumber);
    getSeasonEpisodes({ seasonNumber, tmdbShowId: showId })
      .then((result) => {
        setEpisodesBySeason((current) => ({
          ...current,
          [seasonNumber]: result.episodes,
        }));
      })
      .finally(() => setLoadingSeason(null));
  };

  const setWholeSeason = (
    seasonNumber: number,
    watched: boolean,
    episodeCount: number
  ) => {
    const previous = watchedBySeason;
    const loadedEpisodes = episodesBySeason[seasonNumber];
    // Seasons that were never expanded still fill their bar immediately; the
    // server response then replaces the estimate with the stored numbers.
    const episodeNumbers = loadedEpisodes
      ? loadedEpisodes.map((episode) => episode.episodeNumber)
      : Array.from({ length: episodeCount }, (_, index) => index + 1);
    setPendingSeason(seasonNumber);
    setWatchedBySeason((current) => ({
      ...current,
      [seasonNumber]: watched ? episodeNumbers : [],
    }));

    startTransition(async () => {
      const result = await setSeasonWatched({
        seasonNumber,
        tmdbShowId: showId,
        watched,
      });
      setPendingSeason(null);

      if (result.status === 'login_required') {
        setWatchedBySeason(previous);
        handleLoginRequired();
        return;
      }

      if (result.status === 'error') {
        setWatchedBySeason(previous);
        return;
      }

      setWatchedBySeason((current) => ({
        ...current,
        [seasonNumber]: result.watchedEpisodeNumbers,
      }));
      router.refresh();
    });
  };

  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    const previous = watchedBySeason;
    const nextWatched = !(previous[seasonNumber] ?? []).includes(episodeNumber);
    setPendingSeason(seasonNumber);
    setWatchedBySeason((current) => ({
      ...current,
      [seasonNumber]: nextWatched
        ? withEpisode(current[seasonNumber] ?? [], episodeNumber)
        : withoutEpisode(current[seasonNumber] ?? [], episodeNumber),
    }));

    startTransition(async () => {
      const result = await setEpisodeWatched({
        episodeNumber,
        seasonNumber,
        tmdbShowId: showId,
        watched: nextWatched,
      });
      setPendingSeason(null);

      if (result.status === 'login_required') {
        setWatchedBySeason(previous);
        handleLoginRequired();
        return;
      }

      if (result.status === 'error') {
        setWatchedBySeason(previous);
        return;
      }

      router.refresh();
    });
  };

  return (
    <Grid as="section" gap={4}>
      <Heading fontSize={{ base: 'xl', md: '2xl' }}>Seasons</Heading>

      {visibleSeasons.length > 0 ? (
        <Grid gap={4} templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}>
          {visibleSeasons.map((season) => (
            <SeasonCard
              episodes={episodesBySeason[season.season_number] ?? []}
              isExpanded={expandedSeason === season.season_number}
              isLoadingEpisodes={loadingSeason === season.season_number}
              isPending={isPending && pendingSeason === season.season_number}
              key={`${season.id}-${season.season_number}`}
              onSetWholeSeason={(watched, episodeCount) =>
                setWholeSeason(season.season_number, watched, episodeCount)
              }
              onToggleEpisode={(episodeNumber) =>
                toggleEpisode(season.season_number, episodeNumber)
              }
              onToggleExpanded={() => toggleSeason(season.season_number)}
              season={season}
              showId={showId}
              watchedEpisodeNumbers={
                watchedBySeason[season.season_number] ?? []
              }
            />
          ))}
        </Grid>
      ) : (
        <Text color="fg.muted">
          TMDB does not have season information for this show yet.
        </Text>
      )}

      {specialsSeason ? (
        <Text color="fg.muted" fontSize="sm">
          Specials are tracked on their own season page and are not counted
          toward overall show progress.
        </Text>
      ) : null}
    </Grid>
  );
};
