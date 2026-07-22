'use client';

import { Button, Field, Grid, NativeSelect, Text } from '@chakra-ui/react';
import {
  getRatingState,
  type RatingStateResult,
  removeRating,
  saveRating,
} from 'lib/features/reviews/actions';
import type { RatingTarget } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { RatingDisplay } from './rating-display';

type RatingInputProps = {
  label?: string;
  showAverage?: boolean;
  target: RatingTarget;
};

const ratingOptions = Array.from({ length: 19 }, (_, index) => 1 + index * 0.5);

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

const emptyState: RatingStateResult = {
  averageRating: null,
  rating: null,
  ratingCount: 0,
  status: 'login_required',
};

export const RatingInput = ({
  label = 'Your rating',
  showAverage = true,
  target,
}: RatingInputProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<RatingStateResult>(emptyState);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getRatingState(target).then((result) => {
      if (isMounted) {
        setState(result);
        if (result.status === 'error') {
          setMessage('Your rating could not be loaded. Please try again.');
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [target]);

  const handleLoginRequired = () => {
    router.push(getLoginHref(pathname, searchParams));
  };

  const handleChange = (value: string) => {
    const previousState = state;
    const rating = Number(value);
    setMessage(null);

    setState((current) => ({
      ...current,
      rating,
    }));

    startTransition(async () => {
      const result = await saveRating(target, rating);

      if (result.status === 'login_required') {
        setState(previousState);
        handleLoginRequired();
        return;
      }

      if (result.status === 'error') {
        setState(previousState);
        setMessage('Your rating could not be saved. Please try again.');
        return;
      }

      setState(result);
      setMessage('Your rating was saved.');
    });
  };

  const handleRemove = () => {
    const previousState = state;
    setMessage(null);

    setState((current) => ({
      ...current,
      rating: null,
    }));

    startTransition(async () => {
      const result = await removeRating(target);

      if (result.status === 'login_required') {
        setState(previousState);
        handleLoginRequired();
        return;
      }

      if (result.status === 'error') {
        setState(previousState);
        setMessage('Your rating could not be removed. Please try again.');
        return;
      }

      setState(result);
      setMessage('Your rating was removed.');
    });
  };

  return (
    <Grid gap={2} maxWidth={{ base: '100%', md: '260px' }}>
      <Field.Root disabled={isPending}>
        <Field.Label>{label}</Field.Label>
        <NativeSelect.Root size="md">
          <NativeSelect.Field
            onChange={(event) => handleChange(event.target.value)}
            value={state.rating ?? ''}
          >
            <option disabled value="">
              {state.status === 'error' ? 'Rating unavailable' : 'Not rated'}
            </option>
            {ratingOptions.map((rating) => (
              <option key={rating} value={rating}>
                {rating.toFixed(1)} / 10
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      {showAverage ? (
        <RatingDisplay
          count={state.ratingCount}
          label="Average user rating"
          rating={state.averageRating}
        />
      ) : null}

      {state.rating ? (
        <Button
          alignSelf="flex-start"
          loading={isPending}
          onClick={handleRemove}
          size="xs"
          variant="ghost"
        >
          Remove rating
        </Button>
      ) : (
        <Text color="gray.400" fontSize="sm">
          Save a rating from 1.0 to 10.0.
        </Text>
      )}

      {message ? (
        <Text
          color={message.includes('could not') ? 'red.500' : 'fg.muted'}
          fontSize="sm"
          role={message.includes('could not') ? 'alert' : 'status'}
        >
          {message}
        </Text>
      ) : null}
    </Grid>
  );
};
