'use client';

import {
  Button,
  Field,
  Grid,
  NativeSelect,
  Text,
  Textarea,
} from '@chakra-ui/react';
import {
  getRatingState,
  type RatingStateResult,
  removeRating,
  saveRating,
  saveReview,
} from 'lib/features/reviews/actions';
import { REVIEW_MAX_LENGTH } from 'lib/features/reviews/constants';
import type { RatingTarget } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { RatingDisplay } from './rating-display';

type RatingInputProps = {
  label?: string;
  showAverage?: boolean;
  showReview?: boolean;
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
  review: null,
  status: 'login_required',
};

export const RatingInput = ({
  label = 'Your rating',
  showAverage = true,
  showReview = false,
  target,
}: RatingInputProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<RatingStateResult>(emptyState);
  const [reviewDraft, setReviewDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getRatingState(target).then((result) => {
      if (isMounted) {
        setState(result);
        setReviewDraft(result.review ?? '');
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
      setReviewDraft(result.review ?? '');
      setMessage('Your rating was saved.');
    });
  };

  const handleSaveReview = () => {
    const previousState = state;
    setMessage(null);

    startTransition(async () => {
      const result = await saveReview(target, reviewDraft);

      if (result.status === 'login_required') {
        setState(previousState);
        handleLoginRequired();
        return;
      }

      if (result.status === 'error') {
        setState(previousState);
        setMessage('Your review could not be saved. Please try again.');
        return;
      }

      setState(result);
      setReviewDraft(result.review ?? '');
      setMessage(
        result.review ? 'Your review was saved.' : 'Your review was removed.'
      );
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
      setReviewDraft('');
      setMessage('Your rating was removed.');
    });
  };

  return (
    <Grid
      gap={2}
      maxWidth={{ base: '100%', md: showReview ? '420px' : '260px' }}
    >
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
        <Text color="fg.muted" fontSize="sm">
          Save a rating from 1.0 to 10.0.
        </Text>
      )}

      {showReview && state.rating ? (
        <Field.Root disabled={isPending} marginTop={2}>
          <Field.Label>Your review</Field.Label>
          <Textarea
            maxLength={REVIEW_MAX_LENGTH}
            onChange={(event) => setReviewDraft(event.target.value)}
            placeholder="Share what you thought about it."
            rows={4}
            value={reviewDraft}
          />
          <Field.HelperText>
            Optional. Up to {REVIEW_MAX_LENGTH} characters.
          </Field.HelperText>
          <Button
            alignSelf="flex-start"
            loading={isPending}
            marginTop={2}
            onClick={handleSaveReview}
            size="xs"
            variant="outline"
          >
            {state.review ? 'Update review' : 'Save review'}
          </Button>
        </Field.Root>
      ) : null}

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
