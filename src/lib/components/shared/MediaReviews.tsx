'use client';

import { Avatar, Badge, Button, Flex, Stack, Text } from '@chakra-ui/react';
import { SectionHeading } from 'lib/components/shared/Section';
import type { MediaReview } from 'lib/services/tmdb/reviews';
import type Link from 'next/link';
import { type ComponentProps, useState } from 'react';

/** Reviews longer than this are clamped until the reader expands them. */
const COLLAPSED_CHARACTER_COUNT = 480;
/** One page of TMDB reviews is plenty for a detail page. */
const VISIBLE_REVIEW_COUNT = 6;

// Formatted in UTC with a fixed locale so the server and client agree.
const formatReviewDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
        year: 'numeric',
      });
};

const ReviewCard = ({ review }: { review: MediaReview }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isClamped = review.content.length > COLLAPSED_CHARACTER_COUNT;
  const writtenOn = formatReviewDate(review.createdAt);

  return (
    <Stack
      borderColor="border"
      borderRadius={8}
      borderWidth="1px"
      gap={3}
      padding={{ base: 4, md: 5 }}
    >
      <Flex align="center" gap={3} wrap="wrap">
        <Avatar.Root size="sm">
          <Avatar.Fallback name={review.author} />
        </Avatar.Root>
        <Stack gap={0} minWidth={0}>
          <Text fontWeight="600" lineClamp={1}>
            {review.author}
          </Text>
          {writtenOn ? (
            <Text color="fg.muted" fontSize="xs">
              {writtenOn}
            </Text>
          ) : null}
        </Stack>
        {review.authorRating ? (
          <Badge marginLeft="auto" variant="outline">
            {review.authorRating.toFixed(1)} / 10
          </Badge>
        ) : null}
      </Flex>

      <Text
        color="fg.muted"
        fontSize="sm"
        lineClamp={isExpanded || !isClamped ? undefined : 6}
        whiteSpace="pre-wrap"
      >
        {review.content}
      </Text>

      <Flex align="center" gap={4} wrap="wrap">
        {isClamped ? (
          <Button
            alignSelf="flex-start"
            onClick={() => setIsExpanded((current) => !current)}
            size="xs"
            variant="ghost"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </Button>
        ) : null}
        {review.url ? (
          <Text asChild color="fg.muted" fontSize="xs">
            <a href={review.url} rel="noopener noreferrer" target="_blank">
              Read on TMDB
            </a>
          </Text>
        ) : null}
      </Flex>
    </Stack>
  );
};

/**
 * Member reviews published on TMDB (`/movie/{id}/reviews` and
 * `/tv/{id}/reviews`). They are other people's write-ups, kept separate from
 * the viewer's own rating and review in the personal panel above.
 *
 * A detail page previews the first `VISIBLE_REVIEW_COUNT` reviews and puts
 * "See All" on the section title line — the same action every other section
 * uses — which opens the full list on its own page. That page renders the same
 * component with `showAll`, so it carries every review and no further action.
 */
export const MediaReviews = ({
  reviews,
  seeAllHref,
  showAll = false,
}: {
  reviews: Array<MediaReview>;
  seeAllHref?: ComponentProps<typeof Link>['href'];
  showAll?: boolean;
}) => {
  const visibleReviews = showAll
    ? reviews
    : reviews.slice(0, VISIBLE_REVIEW_COUNT);
  const hasMore = !showAll && reviews.length > visibleReviews.length;

  return (
    <Stack as="section" gap={4}>
      <SectionHeading
        seeAllHref={hasMore && seeAllHref ? seeAllHref : undefined}
        title="Reviews"
      />
      {visibleReviews.length > 0 ? (
        <Stack gap={4}>
          {visibleReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </Stack>
      ) : (
        <Text color="fg.muted">
          No TMDB member has reviewed this title yet.
        </Text>
      )}
    </Stack>
  );
};
