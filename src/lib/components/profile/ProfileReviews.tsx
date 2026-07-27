import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import type { ProfileReviewItem } from 'lib/features/profile/profile-reviews.server';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import { FiStar } from 'react-icons/fi';

/** A review card leads with the poster it belongs to, at this width. */
const posterWidth = { base: '4.5rem', md: '5.5rem' } as const;

// Formatted in UTC with a fixed locale so the server and client agree.
const formatReviewDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
        year: 'numeric',
      });
};

const mediaHref = (item: ProfileReviewItem): Route =>
  (item.mediaType === MediaType.Movie
    ? `/movie/${item.id}`
    : `/tv/show/${item.id}`) as Route;

/**
 * The gold star and score a review is filed under. The icon renders as a child
 * of a styled span rather than through Chakra's `Icon as={...}` prop, because
 * these cards render inside Server Components.
 */
const ReviewRating = ({ rating }: { rating: number }) => (
  <Flex align="center" color="gold.300" gap={1}>
    <Box aria-hidden as="span" display="inline-flex" flexShrink={0}>
      <FiStar fill="currentColor" />
    </Box>
    <Text
      aria-label={`Rated ${rating.toFixed(1)} out of 10`}
      fontSize="sm"
      fontWeight="bold"
    >
      {rating.toFixed(1)}
    </Text>
  </Flex>
);

/**
 * One written review, in the shape a film-diary entry takes: the poster on the
 * left, then the title, the score it was filed under, and the review text.
 */
export const ProfileReviewCard = ({
  clamp = 6,
  review,
}: {
  /** Lines of review text shown before the text is cut off. */
  clamp?: number;
  review: ProfileReviewItem;
}) => {
  const href = mediaHref(review);
  const writtenOn = formatReviewDate(review.updatedAt);

  return (
    <Flex
      _hover={{ borderColor: 'gold.400' }}
      align="stretch"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      gap={{ base: 3, md: 4 }}
      overflow="hidden"
      padding={{ base: 3, md: 4 }}
      transitionDuration="fast"
      transitionProperty="border-color"
      transitionTimingFunction="ease-out"
    >
      <Box asChild flexShrink={0}>
        <Link aria-label={`Open ${review.title}`} href={href} prefetch={false}>
          <Box
            aspectRatio={2 / 3}
            backgroundColor="bg.muted"
            backgroundImage={
              review.posterPath
                ? `url(${IMAGE_URL}${review.posterPath})`
                : undefined
            }
            backgroundPosition="center"
            backgroundSize="cover"
            borderColor="border"
            borderRadius="md"
            borderWidth="1px"
            width={posterWidth}
          />
        </Link>
      </Box>

      <Stack flex="1" gap={2} minWidth={0}>
        <Flex align="center" gap={3} justify="space-between" wrap="wrap">
          <Text
            asChild
            fontSize={{ base: 'sm', md: 'md' }}
            fontWeight="600"
            lineClamp={1}
            minWidth={0}
          >
            <Link href={href} prefetch={false}>
              {review.title}
            </Link>
          </Text>
          <ReviewRating rating={review.rating} />
        </Flex>
        {writtenOn ? (
          <Text color="fg.muted" fontSize="xs">
            {writtenOn}
          </Text>
        ) : null}
        <Text
          color="fg.muted"
          fontSize="sm"
          lineClamp={clamp}
          whiteSpace="pre-wrap"
        >
          {review.review}
        </Text>
      </Stack>
    </Flex>
  );
};

/** The review list shared by the profile section and its "See All" page. */
export const ProfileReviewList = ({
  clamp,
  reviews,
}: {
  clamp?: number;
  reviews: Array<ProfileReviewItem>;
}) => (
  <Box
    display="grid"
    gap={{ base: 3, md: 4 }}
    gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }}
  >
    {reviews.map((review) => (
      <ProfileReviewCard
        clamp={clamp}
        key={`${review.mediaType}-${review.id}`}
        review={review}
      />
    ))}
  </Box>
);
