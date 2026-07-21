'use client';

import { getWatchlistSavedState } from 'lib/features/watchlist/actions';
import { WatchlistButton } from 'lib/features/watchlist/watchlist-button';
import type { MediaType } from 'lib/types';
import { useEffect, useState } from 'react';

type WatchlistMediaType = MediaType.Movie | MediaType.Tv;

type WatchlistStateButtonProps = {
  mediaType: WatchlistMediaType;
  mode?: 'add-only' | 'toggle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tmdbId: number;
};

export const WatchlistStateButton = ({
  mediaType,
  mode,
  size,
  tmdbId,
}: WatchlistStateButtonProps) => {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getWatchlistSavedState({ mediaType, tmdbId }).then((result) => {
      if (isMounted) {
        setIsSaved(result.isSaved);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mediaType, tmdbId]);

  return (
    <WatchlistButton
      initialIsSaved={isSaved}
      mediaType={mediaType}
      mode={mode}
      size={size}
      tmdbId={tmdbId}
    />
  );
};
