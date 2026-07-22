'use client';

import { Button, Text } from '@chakra-ui/react';
import type { TrackableMediaType } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { getFavoriteState, updateFavorite } from './favorite-actions';

export const FavoriteButton = ({
  mediaType,
  tmdbId,
}: {
  mediaType: TrackableMediaType;
  tmdbId: number;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;

    getFavoriteState({ mediaType, tmdbId }).then((result) => {
      if (mounted) {
        if (result.status === 'saved') {
          setFavorite(result.favorite);
        } else if (result.status === 'error') {
          setMessage('Favourite state could not be loaded. Please try again.');
        }
        setIsLoaded(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [mediaType, tmdbId]);

  const handleClick = () => {
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
        setFavorite(favorite);
        const query = searchParams.toString();
        const callbackUrl = query ? `${pathname}?${query}` : pathname;
        router.push(
          `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route
        );
        return;
      }

      if (result.status === 'error') {
        setFavorite(favorite);
        setMessage('Favourite could not be updated. Please try again.');
        return;
      }

      setFavorite(result.favorite);
      setMessage(
        result.favorite
          ? 'Added to Favourite titles.'
          : 'Removed from Favourite titles.'
      );
    });
  };
  let buttonLabel = 'Loading favourite…';

  if (isLoaded) {
    buttonLabel = favorite ? 'Remove from Favourites' : 'Mark as Favourite';
  }

  return (
    <>
      <Button
        aria-pressed={favorite}
        disabled={!isLoaded || message?.includes('could not be loaded')}
        loading={!isLoaded || isPending}
        onClick={handleClick}
        type="button"
        variant={favorite ? 'solid' : 'outline'}
      >
        {buttonLabel}
      </Button>
      {message ? (
        <Text
          color={message.startsWith('Favourite could') ? 'red.500' : 'fg.muted'}
          fontSize="sm"
          role={message.startsWith('Favourite could') ? 'alert' : 'status'}
        >
          {message}
        </Text>
      ) : null}
    </>
  );
};
