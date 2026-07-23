import { Badge, Flex, Text } from '@chakra-ui/react';

type RatingDisplayProps = {
  count?: number;
  emptyLabel?: string;
  label?: string;
  rating: number | null;
};

export const formatUserRating = (rating: number | null) =>
  typeof rating === 'number' && Number.isFinite(rating)
    ? `${rating.toFixed(1)} / 10`
    : null;

export const RatingDisplay = ({
  count,
  emptyLabel = 'Not rated yet',
  label = 'User rating',
  rating,
}: RatingDisplayProps) => {
  const formattedRating = formatUserRating(rating);

  return (
    <Flex alignItems="center" gap={2} wrap="wrap">
      <Text fontSize="sm" letterSpacing={0} textTransform="uppercase">
        {label}:{' '}
        <Text as="span" fontWeight="bold">
          {formattedRating ?? emptyLabel}
        </Text>
      </Text>
      {typeof count === 'number' && count > 0 ? (
        <Badge colorPalette="gold" variant="subtle">
          {count} {count === 1 ? 'rating' : 'ratings'}
        </Badge>
      ) : null}
    </Flex>
  );
};
