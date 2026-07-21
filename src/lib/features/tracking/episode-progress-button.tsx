'use client';

import { Button } from '@chakra-ui/react';
import {
  getEpisodeProgressState,
  setEpisodeWatched,
} from 'lib/features/tracking/actions';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type EpisodeProgressButtonProps = {
  episodeNumber: number;
  initialWatched?: boolean;
  seasonNumber: number;
  size?: 'xs' | 'sm' | 'md';
  tmdbShowId: number;
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

export const EpisodeProgressButton = ({
  episodeNumber,
  initialWatched = false,
  seasonNumber,
  size = 'sm',
  tmdbShowId,
}: EpisodeProgressButtonProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [watched, setWatched] = useState(initialWatched);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getEpisodeProgressState({
      episodeNumber,
      seasonNumber,
      tmdbShowId,
    }).then((result) => {
      if (isMounted && result.status !== 'login_required') {
        setWatched(result.watched);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [episodeNumber, seasonNumber, tmdbShowId]);

  const handleClick = () => {
    const previousWatched = watched;
    const nextWatched = !watched;
    setWatched(nextWatched);

    startTransition(async () => {
      const result = await setEpisodeWatched({
        episodeNumber,
        seasonNumber,
        tmdbShowId,
        watched: nextWatched,
      });

      if (result.status === 'login_required') {
        setWatched(previousWatched);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setWatched(previousWatched);
        return;
      }

      setWatched(result.watched);
      router.refresh();
    });
  };

  return (
    <Button
      alignSelf="flex-start"
      loading={isPending}
      onClick={handleClick}
      size={size}
      variant={watched ? 'outline' : 'solid'}
    >
      {watched ? 'Mark unwatched' : 'Mark watched'}
    </Button>
  );
};
