'use client';

import { Badge, Button, Grid, Heading, Text } from '@chakra-ui/react';
import {
  getReviewsState,
  type ReviewsStateResult,
  removeReview,
} from 'lib/features/reviews/actions';
import type { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { ReviewSocial } from '../social/review-social';
import { ReviewForm } from './review-form';

type ReviewsSectionProps = {
  mediaType: MediaType.Movie | MediaType.Tv;
  title?: string;
  tmdbId: number;
};

const emptyState: ReviewsStateResult = {
  ownReview: null,
  reviews: [],
  status: 'login_required',
};

const getLoginHref = (pathname: string, searchParams: URLSearchParams) => {
  const queryString = searchParams.toString();
  const callbackUrl = queryString ? `${pathname}?${queryString}` : pathname;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));

export const ReviewsSection = ({
  mediaType,
  title = 'Reviews',
  tmdbId,
}: ReviewsSectionProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ReviewsStateResult>(emptyState);
  const [isPending, startTransition] = useTransition();

  const refreshReviews = useCallback(() => {
    getReviewsState(tmdbId, mediaType).then(setState);
  }, [mediaType, tmdbId]);

  useEffect(() => {
    let isMounted = true;

    getReviewsState(tmdbId, mediaType).then((result) => {
      if (isMounted) {
        setState(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mediaType, tmdbId]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await removeReview(tmdbId, mediaType);

      if (result.status === 'login_required') {
        router.push(getLoginHref(pathname, searchParams));
        return;
      }

      setState(result);
      router.refresh();
    });
  };

  return (
    <Grid gap={6} paddingX={{ base: 8, md: 0 }}>
      <Grid gap={2}>
        <Heading fontSize="lg" fontWeight="400" textTransform="uppercase">
          {title}
        </Heading>
        <Text color="gray.400" fontSize="sm">
          {state.reviews.length > 0
            ? `${state.reviews.length} ${
                state.reviews.length === 1 ? 'review' : 'reviews'
              } from TVSync users.`
            : 'No reviews yet.'}
        </Text>
      </Grid>

      {state.status === 'login_required' ? (
        <Button
          alignSelf="flex-start"
          onClick={() => router.push(getLoginHref(pathname, searchParams))}
          variant="outline"
        >
          Sign in to review
        </Button>
      ) : (
        <ReviewForm
          initialReview={state.ownReview}
          key={state.ownReview?.id ?? 'new-review'}
          mediaType={mediaType}
          onSaved={refreshReviews}
          tmdbId={tmdbId}
        />
      )}

      {state.reviews.length > 0 ? (
        <Grid gap={4}>
          {state.reviews.map((review) => (
            <Grid
              borderColor="whiteAlpha.300"
              borderRadius={8}
              borderWidth="1px"
              gap={3}
              key={review.id}
              padding={4}
            >
              <Grid gap={1}>
                <Heading fontSize="md">
                  {review.title || 'Untitled review'}
                </Heading>
                <Text color="gray.400" fontSize="sm">
                  <Link href={`/profile/${review.username}`}>
                    {review.displayName || review.username}
                  </Link>{' '}
                  | {formatDate(review.updatedAt)}
                </Text>
              </Grid>

              <Text whiteSpace="pre-wrap">{review.body}</Text>
              <ReviewSocial
                mediaType={mediaType}
                social={review.social}
                tmdbId={tmdbId}
              />

              <Grid
                alignItems="center"
                gap={2}
                templateColumns="repeat(2, max-content)"
              >
                {review.canEdit ? (
                  <Badge colorPalette="teal" variant="subtle">
                    Your review
                  </Badge>
                ) : null}
                {review.canEdit ? (
                  <Button
                    loading={isPending}
                    onClick={handleDelete}
                    size="xs"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                ) : null}
              </Grid>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Text color="gray.400">
          Be the first TVSync user to leave a review.
        </Text>
      )}
    </Grid>
  );
};
