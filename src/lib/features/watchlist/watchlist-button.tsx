'use client';

import { Button } from '@chakra-ui/react';
import {
  addToWatchlist,
  removeFromWatchlist,
} from 'lib/features/watchlist/actions';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

type WatchlistMediaType = MediaType.Movie | MediaType.Tv;

type WatchlistButtonProps = {
  initialIsSaved?: boolean;
  mediaType: WatchlistMediaType;
  mode?: 'add-only' | 'toggle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tmdbId: number;
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

export const WatchlistButton = ({
  initialIsSaved = false,
  mediaType,
  mode = 'toggle',
  size = 'sm',
  tmdbId,
}: WatchlistButtonProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsSaved(initialIsSaved);
  }, [initialIsSaved]);

  const handleClick = useCallback(() => {
    const nextIsSaved = mode === 'add-only' ? true : !isSaved;
    setIsSaved(nextIsSaved);

    startTransition(async () => {
      const result =
        nextIsSaved || mode === 'add-only'
          ? await addToWatchlist({ mediaType, tmdbId })
          : await removeFromWatchlist({ mediaType, tmdbId });

      if (result.status === 'login_required') {
        setIsSaved(isSaved);
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      if (result.status === 'error') {
        setIsSaved(isSaved);
        return;
      }

      setIsSaved(result.isSaved);
      router.refresh();
    });
  }, [isSaved, mediaType, mode, pathname, router, searchParams, tmdbId]);

  let label = 'Add to Watchlist';

  if (mode === 'add-only' && isSaved) {
    label = 'In Watchlist';
  } else if (isSaved) {
    label = 'Remove from Watchlist';
  }

  return (
    <Button
      alignSelf="flex-start"
      disabled={isPending || (mode === 'add-only' && isSaved)}
      loading={isPending}
      onClick={handleClick}
      size={size}
      variant={isSaved ? 'outline' : 'solid'}
    >
      {label}
    </Button>
  );
};
