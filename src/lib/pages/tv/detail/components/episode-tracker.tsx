'use client';

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import {
  getSeasonEpisodes,
  getShowSeasonProgress,
  type SeasonEpisodeSummary,
  setEpisodeWatched,
  setSeasonWatched,
} from 'lib/features/tracking/actions';
import { getTvProgressSummaryKey } from 'lib/features/tracking/progress-keys';
import type { Season } from 'lib/services/tmdb/tv/detail/types';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { useSWRConfig } from 'swr';

type EpisodesBySeason = Record<number, Array<SeasonEpisodeSummary>>;
type WatchedBySeason = Record<number, Array<number>>;

/** Whole-season toggles reuse the episode key with the impossible episode 0. */
const SEASON_TOGGLE_EPISODE = 0;

const episodeKey = (seasonNumber: number, episodeNumber: number) =>
  `${seasonNumber}-${episodeNumber}`;

const withoutEpisode = (watched: Array<number>, episodeNumber: number) =>
  watched.filter((number) => number !== episodeNumber);

const withEpisode = (watched: Array<number>, episodeNumber: number) =>
  watched.includes(episodeNumber) ? watched : [...watched, episodeNumber];

// Fixed locale and UTC so the server and client render the same date.
const formatAirDate = (airDate: string) => {
  const date = airDate ? new Date(airDate) : null;

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
        year: 'numeric',
      })
    : 'Air date unavailable';
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

/** Yellow while a run is in progress, green once everything is seen. */
const ProgressBar = ({
  total,
  watched,
}: {
  total: number;
  watched: number;
}) => {
  const percent =
    total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0;

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

const SeenButton = ({
  isPending,
  label,
  onToggle,
  watched,
}: {
  isPending: boolean;
  label: string;
  onToggle: () => void;
  watched: boolean;
}) => (
  <Button
    aria-label={watched ? `Mark ${label} unseen` : `Mark ${label} seen`}
    aria-pressed={watched}
    loading={isPending}
    onClick={onToggle}
    size="xs"
    variant={watched ? 'solid' : 'outline'}
  >
    <Icon as={FiCheck} />
    {watched ? 'Seen' : 'Mark as seen'}
  </Button>
);

/** One card in the horizontal episode slider. */
const EpisodeCard = ({
  episode,
  isNext,
  isPending,
  onToggle,
  watched,
}: {
  episode: SeasonEpisodeSummary;
  isNext: boolean;
  isPending: boolean;
  onToggle: () => void;
  watched: boolean;
}) => (
  <Stack
    data-next-episode={isNext ? 'true' : undefined}
    flex="0 0 auto"
    gap={2}
    scrollSnapAlign="start"
    width={{ base: '13rem', md: '15rem' }}
  >
    <Box
      aspectRatio={16 / 9}
      background="bg.muted"
      borderColor={watched ? 'gold.400' : 'border'}
      borderRadius={8}
      borderWidth="1px"
      overflow="hidden"
      position="relative"
    >
      {episode.stillPath ? (
        <Image
          alt={`${episode.name} still`}
          height="full"
          objectFit="cover"
          src={`${IMAGE_URL}${episode.stillPath}`}
          width="full"
        />
      ) : (
        <Flex align="center" height="full" justify="center" padding={3}>
          <Text color="fg.muted" fontSize="xs" textAlign="center">
            No still available
          </Text>
        </Flex>
      )}
      <Badge
        background="rgba(5, 6, 6, 0.75)"
        color="white"
        left={2}
        position="absolute"
        top={2}
      >
        S{episode.seasonNumber} · E{episode.episodeNumber}
      </Badge>
    </Box>

    <Stack gap={0} minWidth={0}>
      <Text fontSize="sm" fontWeight="600" lineClamp={1}>
        {episode.name}
      </Text>
      <Text color="fg.muted" fontSize="xs">
        {formatAirDate(episode.airDate)}
      </Text>
    </Stack>

    <SeenButton
      isPending={isPending}
      label={`episode ${episode.episodeNumber}`}
      onToggle={onToggle}
      watched={watched}
    />
  </Stack>
);

/** One row in an expanded season. */
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
        {formatAirDate(episode.airDate)}
        {episode.runtime > 0 ? ` · ${episode.runtime} min` : ''}
      </Text>
    </Stack>
    <SeenButton
      isPending={isPending}
      label={`episode ${episode.episodeNumber}`}
      onToggle={onToggle}
      watched={watched}
    />
  </Flex>
);

const SeasonEpisodeList = ({
  episodes,
  isLoading,
  isEpisodePending,
  onToggleEpisode,
  watchedEpisodeNumbers,
}: {
  episodes: Array<SeasonEpisodeSummary>;
  isEpisodePending: (episodeNumber: number) => boolean;
  isLoading: boolean;
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

  return episodes.map((episode) => (
    <EpisodeRow
      episode={episode}
      isPending={isEpisodePending(episode.episodeNumber)}
      key={episode.episodeNumber}
      onToggle={() => onToggleEpisode(episode.episodeNumber)}
      watched={watchedEpisodeNumbers.includes(episode.episodeNumber)}
    />
  ));
};

/**
 * A season row: a dropdown header with its own progress that expands in place
 * to the episode titles, each with its own "seen" toggle.
 */
const SeasonDropdown = ({
  episodes,
  isExpanded,
  isEpisodePending,
  isLoading,
  isSeasonPending,
  onToggleEpisode,
  onToggleExpanded,
  onToggleSeason,
  season,
  showId,
  watchedEpisodeNumbers,
}: {
  episodes: Array<SeasonEpisodeSummary>;
  isEpisodePending: (episodeNumber: number) => boolean;
  isExpanded: boolean;
  isLoading: boolean;
  isSeasonPending: boolean;
  onToggleEpisode: (episodeNumber: number) => void;
  onToggleExpanded: () => void;
  onToggleSeason: (watched: boolean) => void;
  season: Season;
  showId: number;
  watchedEpisodeNumbers: Array<number>;
}) => {
  const seasonNumber = season.season_number;
  const seasonHref = `/tv/show/${showId}/season/${seasonNumber}` as Route;
  const episodeCount =
    episodes.length > 0 ? episodes.length : season.episode_count;
  const watchedCount = watchedEpisodeNumbers.length;
  const isComplete = episodeCount > 0 && watchedCount >= episodeCount;

  return (
    <Stack borderColor="border" borderRadius={8} borderWidth="1px" gap={0}>
      <Flex
        align="center"
        asChild
        gap={3}
        paddingX={4}
        paddingY={3}
        textAlign="left"
        width="full"
      >
        <button
          aria-controls={`season-${seasonNumber}-episodes`}
          aria-expanded={isExpanded}
          onClick={onToggleExpanded}
          type="button"
        >
          <Stack gap={1} minWidth={0} width="full">
            <Flex align="center" gap={2} wrap="wrap">
              <Text fontWeight="600">
                {season.name || `Season ${seasonNumber}`}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {watchedCount} / {episodeCount} seen
              </Text>
            </Flex>
            <ProgressBar total={episodeCount} watched={watchedCount} />
          </Stack>
          <Icon
            as={FiChevronDown}
            flexShrink={0}
            transform={isExpanded ? 'rotate(180deg)' : undefined}
            transitionDuration="fast"
            transitionProperty="transform"
            transitionTimingFunction="ease-out"
          />
        </button>
      </Flex>

      {isExpanded ? (
        <Stack
          gap={2}
          id={`season-${seasonNumber}-episodes`}
          paddingBottom={4}
          paddingX={4}
        >
          <Flex align="center" gap={4} wrap="wrap">
            <Button
              loading={isSeasonPending}
              onClick={() => onToggleSeason(!isComplete)}
              size="xs"
              variant={isComplete ? 'outline' : 'solid'}
            >
              {isComplete ? 'Mark season unseen' : 'Mark season seen'}
            </Button>
            <Text asChild color="fg.muted" fontSize="xs">
              <Link href={seasonHref} prefetch={false}>
                Open season page
              </Link>
            </Text>
          </Flex>

          <SeasonEpisodeList
            episodes={episodes}
            isEpisodePending={isEpisodePending}
            isLoading={isLoading}
            onToggleEpisode={onToggleEpisode}
            watchedEpisodeNumbers={watchedEpisodeNumbers}
          />
        </Stack>
      ) : null}
    </Stack>
  );
};

/**
 * The episode surface of a TV show, in the shape TV Time made familiar: the
 * season you are actually watching slides left to right as episode cards you
 * tick off one tap at a time, and every season sits below it as a dropdown that
 * opens to its episode titles with the same "seen" toggle.
 */
export const EpisodeTracker = ({
  seasons,
  showId,
}: {
  seasons: Array<Season>;
  showId: number;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const railRef = useRef<HTMLDivElement>(null);
  const alignedSeasonRef = useRef<number | null>(null);
  const [watchedBySeason, setWatchedBySeason] = useState<WatchedBySeason>({});
  const [episodesBySeason, setEpisodesBySeason] = useState<EpisodesBySeason>(
    {}
  );
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [loadingSeason, setLoadingSeason] = useState<number | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Array<string>>([]);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [, startTransition] = useTransition();

  const regularSeasons = useMemo(
    () =>
      seasons
        .filter(
          (season) => season.season_number > 0 && season.episode_count > 0
        )
        .toSorted((left, right) => left.season_number - right.season_number),
    [seasons]
  );

  // The slider opens on the season being watched: the first one with an
  // unseen episode, or the final season once the show is finished.
  const currentSeason = useMemo(
    () =>
      regularSeasons.find(
        (season) =>
          (watchedBySeason[season.season_number] ?? []).length <
          season.episode_count
      ) ?? regularSeasons.at(-1),
    [regularSeasons, watchedBySeason]
  );
  const currentSeasonNumber = currentSeason?.season_number ?? null;
  const currentEpisodes =
    currentSeasonNumber === null
      ? []
      : (episodesBySeason[currentSeasonNumber] ?? []);
  const currentWatched =
    currentSeasonNumber === null
      ? []
      : (watchedBySeason[currentSeasonNumber] ?? []);
  const nextEpisodeNumber = currentEpisodes.find(
    (episode) => !currentWatched.includes(episode.episodeNumber)
  )?.episodeNumber;

  const totalEpisodeCount = regularSeasons.reduce(
    (total, season) => total + season.episode_count,
    0
  );
  const watchedEpisodeCount = regularSeasons.reduce(
    (total, season) =>
      total + (watchedBySeason[season.season_number] ?? []).length,
    0
  );

  const loadSeasonEpisodes = useCallback(
    (seasonNumber: number) => {
      setLoadingSeason(seasonNumber);

      return getSeasonEpisodes({ seasonNumber, tmdbShowId: showId })
        .then((result) => {
          setEpisodesBySeason((current) => ({
            ...current,
            [seasonNumber]: result.episodes,
          }));
        })
        .finally(() => setLoadingSeason(null));
    },
    [showId]
  );

  useEffect(() => {
    let isMounted = true;

    getShowSeasonProgress(showId)
      .then((result) => {
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
      })
      .finally(() => {
        if (isMounted) {
          setIsProgressLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showId]);

  // Whichever season the slider lands on, its episodes are loaded on demand.
  // Progress settles first so a viewer halfway through a show does not pay for
  // the premiere season's episodes before the slider moves to their season.
  useEffect(() => {
    if (
      !isProgressLoaded ||
      currentSeasonNumber === null ||
      episodesBySeason[currentSeasonNumber]
    ) {
      return;
    }

    loadSeasonEpisodes(currentSeasonNumber);
  }, [
    currentSeasonNumber,
    episodesBySeason,
    isProgressLoaded,
    loadSeasonEpisodes,
  ]);

  // The rail opens on the next unseen episode rather than the season premiere,
  // and only realigns when the slider moves to another season — ticking an
  // episode off must never yank the row the viewer is looking at.
  useEffect(() => {
    const rail = railRef.current;

    if (
      currentSeasonNumber === null ||
      currentEpisodes.length === 0 ||
      alignedSeasonRef.current === currentSeasonNumber ||
      !rail
    ) {
      return;
    }

    alignedSeasonRef.current = currentSeasonNumber;
    const card = rail.querySelector<HTMLElement>('[data-next-episode="true"]');

    if (card) {
      rail.scrollLeft +=
        card.getBoundingClientRect().left - rail.getBoundingClientRect().left;
    }
  }, [currentEpisodes.length, currentSeasonNumber]);

  const handleLoginRequired = () => {
    router.push(getLoginHref(pathname, searchParams));
  };

  // The library panel and the server-rendered tree both read this progress.
  const refreshProgress = () => {
    mutate(getTvProgressSummaryKey(showId));
    router.refresh();
  };

  const releasePendingKey = (key: string) =>
    setPendingKeys((current) => current.filter((pending) => pending !== key));

  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    const key = episodeKey(seasonNumber, episodeNumber);
    const previous = watchedBySeason;
    const nextWatched = !(previous[seasonNumber] ?? []).includes(episodeNumber);

    setPendingKeys((current) => [...current, key]);
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
      releasePendingKey(key);

      if (result.status === 'login_required') {
        setWatchedBySeason(previous);
        handleLoginRequired();
        return;
      }

      if (result.status === 'error') {
        setWatchedBySeason(previous);
        return;
      }

      refreshProgress();
    });
  };

  const toggleWholeSeason = (seasonNumber: number, watched: boolean) => {
    const key = episodeKey(seasonNumber, SEASON_TOGGLE_EPISODE);
    const previous = watchedBySeason;
    const loadedEpisodes = episodesBySeason[seasonNumber];
    const episodeCount =
      regularSeasons.find((season) => season.season_number === seasonNumber)
        ?.episode_count ?? 0;
    // A season that was never opened still fills its bar immediately; the saved
    // response then replaces the estimate with the stored episode numbers.
    const episodeNumbers = loadedEpisodes
      ? loadedEpisodes.map((episode) => episode.episodeNumber)
      : Array.from({ length: episodeCount }, (_, index) => index + 1);

    setPendingKeys((current) => [...current, key]);
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
      releasePendingKey(key);

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
      refreshProgress();
    });
  };

  const toggleSeasonExpanded = (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }

    setExpandedSeason(seasonNumber);

    if (!episodesBySeason[seasonNumber]) {
      loadSeasonEpisodes(seasonNumber);
    }
  };

  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;

    if (rail) {
      rail.scrollBy({
        behavior: 'smooth',
        left: direction * rail.clientWidth * 0.8,
      });
    }
  };

  if (regularSeasons.length === 0) {
    return (
      <Stack as="section" gap={3}>
        <Heading fontSize={{ base: 'xl', md: '2xl' }}>Episodes</Heading>
        <Text color="fg.muted">
          TMDB does not have season information for this show yet.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack as="section" gap={{ base: 6, md: 8 }}>
      <Stack gap={4}>
        <Flex align="center" gap={3} justify="space-between" wrap="wrap">
          <Stack gap={0}>
            <Heading fontSize={{ base: 'xl', md: '2xl' }}>
              {currentSeason?.name || `Season ${currentSeasonNumber}`}
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              {watchedEpisodeCount} of {totalEpisodeCount} episodes seen
            </Text>
          </Stack>
          <Flex gap={2}>
            <Button
              aria-label="Scroll to earlier episodes"
              onClick={() => scrollRail(-1)}
              size="sm"
              variant="outline"
            >
              <Icon as={FiChevronLeft} />
            </Button>
            <Button
              aria-label="Scroll to later episodes"
              onClick={() => scrollRail(1)}
              size="sm"
              variant="outline"
            >
              <Icon as={FiChevronRight} />
            </Button>
          </Flex>
        </Flex>

        <ProgressBar total={totalEpisodeCount} watched={watchedEpisodeCount} />

        {currentEpisodes.length > 0 ? (
          <Flex
            css={{ scrollbarWidth: 'thin' }}
            gap={{ base: 4, md: 5 }}
            overflowX="auto"
            paddingBottom={2}
            ref={railRef}
            scrollSnapType="x proximity"
          >
            {currentEpisodes.map((episode) => (
              <EpisodeCard
                episode={episode}
                isNext={episode.episodeNumber === nextEpisodeNumber}
                isPending={pendingKeys.includes(
                  episodeKey(episode.seasonNumber, episode.episodeNumber)
                )}
                key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                onToggle={() =>
                  toggleEpisode(episode.seasonNumber, episode.episodeNumber)
                }
                watched={currentWatched.includes(episode.episodeNumber)}
              />
            ))}
          </Flex>
        ) : (
          <Text color="fg.muted" fontSize="sm" role="status">
            Loading episodes…
          </Text>
        )}
      </Stack>

      <Stack gap={3}>
        <Heading fontSize={{ base: 'lg', md: 'xl' }}>Seasons</Heading>
        {regularSeasons.map((season) => (
          <SeasonDropdown
            episodes={episodesBySeason[season.season_number] ?? []}
            isEpisodePending={(episodeNumber) =>
              pendingKeys.includes(
                episodeKey(season.season_number, episodeNumber)
              )
            }
            isExpanded={expandedSeason === season.season_number}
            isLoading={loadingSeason === season.season_number}
            isSeasonPending={pendingKeys.includes(
              episodeKey(season.season_number, SEASON_TOGGLE_EPISODE)
            )}
            key={`${season.id}-${season.season_number}`}
            onToggleEpisode={(episodeNumber) =>
              toggleEpisode(season.season_number, episodeNumber)
            }
            onToggleExpanded={() => toggleSeasonExpanded(season.season_number)}
            onToggleSeason={(watched) =>
              toggleWholeSeason(season.season_number, watched)
            }
            season={season}
            showId={showId}
            watchedEpisodeNumbers={watchedBySeason[season.season_number] ?? []}
          />
        ))}
      </Stack>
    </Stack>
  );
};
