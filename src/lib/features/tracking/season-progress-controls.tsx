'use client';

import { Button, Flex, Text } from '@chakra-ui/react';
import {
  getSeasonProgressState,
  setSeasonWatched,
} from 'lib/features/tracking/actions';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type SeasonProgressControlsProps = {
  episodeCount: number;
  seasonNumber: number;
  tmdbShowId: number;
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

export const SeasonProgressControls = ({
  episodeCount,
  seasonNumber,
  tmdbShowId,
}: SeasonProgressControlsProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [watchedCount, setWatchedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getSeasonProgressState({ seasonNumber, tmdbShowId }).then((result) => {
      if (isMounted && result.status !== 'login_required') {
        setWatchedCount(result.watchedEpisodeNumbers.length);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [seasonNumber, tmdbShowId]);

  const setWholeSeason = (watched: boolean) => {
    const previousWatchedCount = watchedCount;
    setWatchedCount(watched ? episodeCount : 0);

    startTransition(async () => {
      const result = await setSeasonWatched({
        seasonNumber,
        tmdbShowId,
        watched,
      });

      if (result.status === 'login_required') {
        setWatchedCount(previousWatchedCount);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setWatchedCount(previousWatchedCount);
        return;
      }

      setWatchedCount(result.watchedEpisodeNumbers.length);
      router.refresh();
    });
  };

  return (
    <Flex align="center" gap={3} wrap="wrap">
      <Text color="gray.300" fontSize="sm">
        {watchedCount} / {episodeCount} watched
      </Text>
      <Button
        loading={isPending}
        onClick={() => setWholeSeason(true)}
        size="sm"
      >
        Mark season watched
      </Button>
      <Button
        loading={isPending}
        onClick={() => setWholeSeason(false)}
        size="sm"
        variant="outline"
      >
        Mark season unwatched
      </Button>
    </Flex>
  );
};
