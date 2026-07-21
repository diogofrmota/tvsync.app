'use client';

import { AspectRatio, Box } from '@chakra-ui/react';
import MotionBox from 'lib/components/MotionBox';
import PosterImage from 'lib/components/shared/PosterImage';
import PosterLabel from 'lib/components/shared/PosterLabel';
import type { MediaType } from 'lib/types';
import { trackEvent } from 'lib/utils/track-event';
import Link from 'next/link';

const pathMap = {
  movie: '/movie',
  tv: '/tv/show',
  person: '/person',
} as const;

type PosterCardProps = {
  id: number;
  name?: string;
  imageUrl?: string | null;
  mediaType: MediaType;
  layout: 'flex' | 'grid';
  isLastItem?: boolean;
  prefetch?: boolean;
};

const PosterCard = ({
  id,
  name,
  imageUrl,
  mediaType,
  layout,
  isLastItem,
  prefetch = true,
}: PosterCardProps) => {
  const handleClick = () => {
    trackEvent({
      eventName: `${mediaType}: ${name ?? 'Untitled'} - ${id}`,
      eventData: { type: 'navigate' },
    });
  };
  const label = name?.trim() || 'Untitled title';

  return (
    <MotionBox
      // https://panda-css.com/docs/docs/concepts/conditional-styles#group-selectors
      className="group"
      onClick={handleClick}
      paddingRight={isLastItem ? [8, 6] : undefined}
      position="relative"
      textAlign="center"
      whileHover={{ scale: 1.05 }}
      width={
        layout === 'flex'
          ? { base: '7.5rem', sm: '8.25rem', md: '9rem' }
          : undefined
      }
      {...(layout === 'flex' && { flex: '0 0 auto' })}
    >
      {layout === 'grid' ? (
        <Link
          aria-label={`Open ${label}`}
          href={`${pathMap[mediaType]}/${id}`}
          prefetch={prefetch}
        >
          <AspectRatio
            _groupHover={{ backgroundColor: 'black' }}
            borderRadius="md"
            overflow="hidden"
            ratio={3.6 / 5}
          >
            <PosterImage
              alt={`${label} poster`}
              layout={layout}
              src={imageUrl}
            />
          </AspectRatio>
        </Link>
      ) : (
        <Box
          _groupHover={{ backgroundColor: 'black' }}
          asChild
          borderRadius="md"
          overflow="hidden"
        >
          <Link
            aria-label={`Open ${label}`}
            href={`${pathMap[mediaType]}/${id}`}
            prefetch={prefetch}
          >
            <PosterImage
              alt={`${label} poster`}
              layout={layout}
              src={imageUrl}
            />
          </Link>
        </Box>
      )}
      <PosterLabel label={label} />
    </MotionBox>
  );
};

export default PosterCard;
