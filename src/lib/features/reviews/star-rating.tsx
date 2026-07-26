'use client';

import { Box, Flex, Icon } from '@chakra-ui/react';
import { useState } from 'react';
import { FiStar } from 'react-icons/fi';

/** Ratings run from 0.5 to 10, which is exactly ten stars with half steps. */
const STAR_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type StarRatingProps = {
  disabled?: boolean;
  label: string;
  onChange: (rating: number) => void;
  rating: number | null;
};

const starBoxSize = { base: '1.375rem', md: '1.5rem' } as const;

/** How much of one star is painted for the rating currently being shown. */
const fillPercent = (star: number, rating: number) =>
  Math.min(100, Math.max(0, (rating - (star - 1)) * 100));

const Star = ({ percent }: { percent: number }) => (
  <Box
    color={percent > 0 ? 'gold.400' : 'fg.muted'}
    height={starBoxSize}
    position="relative"
    width={starBoxSize}
  >
    <Icon as={FiStar} boxSize="full" />
    <Box
      height="full"
      left={0}
      overflow="hidden"
      position="absolute"
      top={0}
      width={`${percent}%`}
    >
      <Icon as={FiStar} boxSize={starBoxSize} fill="currentColor" />
    </Box>
  </Box>
);

/**
 * A ten-star rating control. Each star carries two hit areas so the half-point
 * scale the app has always stored stays reachable, and hovering previews the
 * value the click would save.
 */
export const StarRating = ({
  disabled = false,
  label,
  onChange,
  rating,
}: StarRatingProps) => {
  const [preview, setPreview] = useState<number | null>(null);
  const shownRating = preview ?? rating ?? 0;

  const hitArea = (value: number) => (
    <Box
      asChild
      bottom={0}
      left={value % 1 === 0 ? '50%' : 0}
      position="absolute"
      top={0}
      width="50%"
      zIndex={1}
    >
      <button
        aria-label={`Rate ${value.toFixed(1)} out of 10`}
        disabled={disabled}
        onBlur={() => setPreview(null)}
        onClick={() => onChange(value)}
        onFocus={() => setPreview(value)}
        onMouseEnter={() => setPreview(value)}
        type="button"
      />
    </Box>
  );

  return (
    <Flex
      aria-label={label}
      gap={0.5}
      onMouseLeave={() => setPreview(null)}
      opacity={disabled ? 0.6 : 1}
      role="group"
      wrap="wrap"
    >
      {STAR_VALUES.map((star) => (
        <Box key={star} position="relative">
          <Star percent={fillPercent(star, shownRating)} />
          {hitArea(star - 0.5)}
          {hitArea(star)}
        </Box>
      ))}
    </Flex>
  );
};
