'use client';

import {
  Button,
  Field,
  Flex,
  Input,
  Stack,
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
import { FiStar } from 'react-icons/fi';

import { RatingDisplay } from './rating-display';

type RatingInputProps = {
  label?: string;
  showAverage?: boolean;
  showReview?: boolean;
  target: RatingTarget;
};

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
  const [ratingDraft, setRatingDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    getRatingState(target).then((result) => {
      if (isMounted) {
        setState(result);
        setReviewDraft(result.review ?? '');
        setRatingDraft(result.rating === null ? '' : result.rating.toFixed(1));
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

  const handleRatingSave = () => {
    const normalizedDraft = ratingDraft.trim().replace(',', '.');
    const rating = Number(normalizedDraft);

    if (
      !(normalizedDraft && Number.isFinite(rating)) ||
      rating < 0 ||
      rating > 10 ||
      Math.round(rating * 10) / 10 !== rating
    ) {
      setMessage('Enter a rating from 0 to 10 with up to one decimal place.');
      return;
    }

    const previousState = state;
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
      setRatingDraft(rating.toFixed(1));
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
    setRatingDraft('');

    startTransition(async () => {
      const result = await removeRating(target);

      if (result.status === 'login_required') {
        setState(previousState);
        setRatingDraft(
          previousState.rating === null ? '' : previousState.rating.toFixed(1)
        );
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
    <Stack
      gap={3}
      maxWidth={{ base: '100%', md: showReview ? '38rem' : '26rem' }}
    >
      <Stack gap={2}>
        <Text color="fg.muted" fontSize="sm">
          {label}
        </Text>
        <Flex align="center" gap={2} wrap="wrap">
          <Input
            aria-label={label}
            disabled={isPending || state.status === 'error'}
            inputMode="decimal"
            maxLength={4}
            onBlur={handleRatingSave}
            onChange={(event) => setRatingDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleRatingSave();
              }
            }}
            placeholder="0–10"
            type="text"
            value={ratingDraft}
            width="6rem"
          />
          <Text alignItems="center" display="flex" fontWeight="600" gap={1}>
            / 10 <FiStar aria-hidden />
          </Text>
          {state.rating !== null ? (
            <Button
              loading={isPending}
              onClick={handleRemove}
              size="xs"
              variant="ghost"
            >
              Remove rating
            </Button>
          ) : null}
        </Flex>
      </Stack>

      {showAverage ? (
        <RatingDisplay
          count={state.ratingCount}
          label="Average user rating"
          rating={state.averageRating}
        />
      ) : null}

      {showReview ? (
        <Field.Root disabled={isPending || state.rating === null}>
          <Text color="fg.muted" fontSize="sm">
            Your review
          </Text>
          <Textarea
            maxLength={REVIEW_MAX_LENGTH}
            onChange={(event) => setReviewDraft(event.target.value)}
            placeholder={
              state.rating !== null
                ? 'Share what you thought about it.'
                : 'Pick a star rating to leave a review.'
            }
            rows={4}
            value={reviewDraft}
          />
          <Field.HelperText>
            Up to {REVIEW_MAX_LENGTH} characters.
          </Field.HelperText>
          <Button
            alignSelf="flex-start"
            disabled={state.rating === null}
            loading={isPending}
            marginTop={2}
            onClick={handleSaveReview}
            size="xs"
            variant="outline"
          >
            Publish
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
    </Stack>
  );
};
