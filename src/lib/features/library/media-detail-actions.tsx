'use client';

import { Button, Flex, Icon, IconButton, Text } from '@chakra-ui/react';
import {
  removeMovieFromLibrary,
  removeTvShowFromLibrary,
  updateMovieLibraryStatus,
  updateTvLibraryStatus,
} from 'lib/features/library/actions';
import type { TvLibrarySectionStatus } from 'lib/features/library/types';
import {
  getFavoriteState,
  updateFavorite,
} from 'lib/features/profile/favorite-actions';
import { getMediaTrackingState } from 'lib/features/tracking/actions';
import {
  MediaType,
  type MovieWatchStatus,
  type TrackableMediaType,
  WatchStatus,
} from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { FiCheck, FiHeart, FiPlus, FiX } from 'react-icons/fi';

type MediaDetailActionsProps = {
  /** The label of the single button shown before the title is saved. */
  addLabel: string;
  mediaType: TrackableMediaType;
  /** The label the same button takes once the title is in the library. */
  removeLabel: string;
  tmdbId: number;
};

/**
 * A title that is being tracked but has not been finished sits in the status the
 * "Mark as Finished" toggle returns it to: a movie is simply planned, while a
 * show that has episodes marked seen is being watched.
 */
const trackingStatuses = {
  [MediaType.Movie]: {
    finished: WatchStatus.Watched,
    initial: WatchStatus.Planned,
    unfinished: WatchStatus.Planned,
  },
  [MediaType.Tv]: {
    finished: WatchStatus.Completed,
    initial: WatchStatus.Planned,
    unfinished: WatchStatus.Watching,
  },
} as const;

/**
 * The round controls beside the add/remove pill. They are icon-only by design,
 * so each one carries its state in `aria-label` and `aria-pressed` rather than
 * in visible text.
 */
const circleButtonProps = {
  _hover: { background: 'whiteAlpha.300' },
  background: 'whiteAlpha.200',
  borderRadius: 'full',
  color: 'white',
  height: { base: '2.75rem', md: '3rem' },
  minWidth: 'auto',
  variant: 'ghost',
  width: { base: '2.75rem', md: '3rem' },
} as const;

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const query = searchParams.toString();
  const callbackUrl = query ? `${pathname}?${query}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

/**
 * The whole personal panel of a detail page, in one row directly under the
 * header poster: a pill that adds the title to the library and becomes the pill
 * that removes it again, followed — once the title is saved — by the round
 * check that marks it finished and the round heart that favourites it. Every
 * mutation is optimistic and rolls back to the previous state when the server
 * rejects it.
 */
export const MediaDetailActions = ({
  addLabel,
  mediaType,
  removeLabel,
  tmdbId,
}: MediaDetailActionsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statuses = trackingStatuses[mediaType];
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getMediaTrackingState({ mediaType, tmdbId }),
      getFavoriteState({ mediaType, tmdbId }),
    ]).then(([tracking, favoriteState]) => {
      if (!isMounted) {
        return;
      }

      if (tracking.status === 'login_required') {
        router.replace(getLoginHref(pathname, searchParams));
        return;
      }

      if (tracking.status === 'error') {
        setLoadFailed(true);
        setIsLoading(false);
        return;
      }

      setStatus(tracking.watchStatus);
      setFavorite(
        favoriteState.status === 'saved' ? favoriteState.favorite : false
      );
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [mediaType, pathname, router, searchParams, tmdbId]);

  const saveStatus = (nextStatus: WatchStatus) => {
    const previousStatus = status;
    setStatus(nextStatus);
    setMessage(null);

    startTransition(async () => {
      const result =
        mediaType === MediaType.Movie
          ? await updateMovieLibraryStatus({
              status: nextStatus as MovieWatchStatus,
              tmdbId,
            })
          : await updateTvLibraryStatus({
              status: nextStatus as TvLibrarySectionStatus,
              tmdbId,
            });

      if (result.status === 'login_required') {
        setStatus(previousStatus);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setStatus(previousStatus);
        setMessage(result.message);
        return;
      }

      setStatus(result.watchStatus);
      router.refresh();
    });
  };

  const remove = () => {
    const previousStatus = status;
    const previousFavorite = favorite;
    setStatus(null);
    setFavorite(false);
    setMessage(null);

    startTransition(async () => {
      // A removed title keeps no favourite marker, so both rows go together.
      if (previousFavorite) {
        await updateFavorite({ favorite: false, mediaType, tmdbId });
      }

      const result =
        mediaType === MediaType.Movie
          ? await removeMovieFromLibrary({ tmdbId })
          : await removeTvShowFromLibrary({ tmdbId });

      if (result.status === 'login_required') {
        setStatus(previousStatus);
        setFavorite(previousFavorite);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setStatus(previousStatus);
        setFavorite(previousFavorite);
        setMessage(result.message);
        return;
      }

      router.refresh();
    });
  };

  const toggleFavorite = () => {
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    setMessage(null);

    startTransition(async () => {
      const result = await updateFavorite({
        favorite: nextFavorite,
        mediaType,
        tmdbId,
      });

      if (result.status === 'login_required') {
        setFavorite(!nextFavorite);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setFavorite(!nextFavorite);
        setMessage('We could not update your favourites. Please try again.');
        return;
      }

      router.refresh();
    });
  };

  if (isLoading) {
    return <Text color="fg.muted">Loading your library…</Text>;
  }

  if (loadFailed) {
    return (
      <Text color="red.500" role="alert">
        Your library status could not be loaded. Please try again later.
      </Text>
    );
  }

  if (!status) {
    return (
      <Flex direction="column" gap={2}>
        <Button
          alignSelf="flex-start"
          gap={2}
          loading={isPending}
          onClick={() => saveStatus(statuses.initial)}
          paddingX={6}
          size="lg"
          type="button"
          variant="outline"
        >
          <Icon as={FiPlus} />
          {addLabel}
        </Button>
        {message ? (
          <Text color="red.500" fontSize="sm" role="alert">
            {message}
          </Text>
        ) : null}
      </Flex>
    );
  }

  const isFinished = status === statuses.finished;

  return (
    <Flex direction="column" gap={2}>
      <Flex align="center" gap={3} wrap="wrap">
        {/* The pill keeps the place the "Add" button held, so removing a title
            is the same one click in the same spot that added it. */}
        <Button
          _hover={{ background: 'whiteAlpha.300' }}
          background="whiteAlpha.200"
          color="white"
          disabled={isPending}
          gap={2}
          onClick={remove}
          paddingX={6}
          size="lg"
          type="button"
          variant="ghost"
        >
          <Icon as={FiX} />
          {removeLabel}
        </Button>
        <IconButton
          aria-label={isFinished ? 'Finished' : 'Mark as Finished'}
          aria-pressed={isFinished}
          disabled={isPending}
          onClick={() =>
            saveStatus(isFinished ? statuses.unfinished : statuses.finished)
          }
          type="button"
          {...circleButtonProps}
          background={isFinished ? 'gold.400' : circleButtonProps.background}
          color={isFinished ? 'gray.900' : circleButtonProps.color}
        >
          <Icon as={FiCheck} />
        </IconButton>
        <IconButton
          aria-label={favorite ? 'Remove from Favourites' : 'Mark as Favourite'}
          aria-pressed={favorite}
          disabled={isPending}
          onClick={toggleFavorite}
          type="button"
          {...circleButtonProps}
          color={favorite ? 'red.500' : circleButtonProps.color}
        >
          <Icon as={FiHeart} fill={favorite ? 'currentColor' : 'none'} />
        </IconButton>
      </Flex>
      {message ? (
        <Text color="red.500" fontSize="sm" role="alert">
          {message}
        </Text>
      ) : null}
    </Flex>
  );
};
