'use client';

import { AspectRatio, Badge, Box, Stack, Text } from '@chakra-ui/react';
import PosterImage from 'lib/components/shared/PosterImage';
import { MediaQuickActions } from 'lib/features/library/media-quick-actions';
import { MediaType } from 'lib/types';
import { trackEvent } from 'lib/utils/track-event';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

const pathMap = { movie: '/movie', tv: '/tv/show', person: '/person' } as const;

type PosterCardProps = {
  actions?: ReactNode;
  id: number;
  imageUrl?: string | null;
  isLastItem?: boolean;
  layout: 'flex' | 'grid';
  /**
   * Own-library surfaces (Movies, TV Shows, and the signed-in profile) hide the
   * library chips because everything listed there is already saved. Discovery
   * surfaces and other people's profiles keep them.
   */
  libraryBadges?: boolean;
  mediaType: MediaType;
  name?: string;
  prefetch?: boolean;
  progress?: number;
  status?: string | null;
};

/**
 * Watch progress reads straight off the artwork: a yellow bar that fills as
 * episodes are watched and turns green across the full poster width once the
 * title is finished. A title that has not been started shows no bar at all.
 */
const PosterProgressBar = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => {
  const percent = Math.max(0, Math.min(value, 100));
  const isComplete = percent >= 100;

  return (
    <Box
      aria-label={`${label} watch progress`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(percent)}
      background="blackAlpha.700"
      bottom={0}
      height={{ base: '4px', md: '5px' }}
      left={0}
      position="absolute"
      right={0}
      role="progressbar"
      zIndex={2}
    >
      <Box
        background={isComplete ? 'green.400' : 'gold.400'}
        height="full"
        transitionDuration="moderate"
        transitionProperty="width, background"
        transitionTimingFunction="ease-out"
        width={`${percent}%`}
      />
    </Box>
  );
};

const PosterCard = ({
  actions,
  id,
  imageUrl,
  isLastItem,
  layout,
  libraryBadges = true,
  mediaType,
  name,
  prefetch = true,
  progress,
  status,
}: PosterCardProps) => {
  const label = name?.trim() || 'Untitled title';
  const href = `${pathMap[mediaType]}/${id}` as Route;
  const isTrackable =
    mediaType === MediaType.Movie || mediaType === MediaType.Tv;
  const hasProgress = typeof progress === 'number' && progress > 0;
  const showStatusBadge = libraryBadges && Boolean(status);

  return (
    <Stack
      gap={2}
      minWidth={0}
      paddingRight={isLastItem ? { base: 4, md: 0 } : undefined}
      width={
        layout === 'flex' ? { base: '7rem', sm: '8rem', md: '9rem' } : 'full'
      }
      {...(layout === 'flex' ? { flex: '0 0 auto' } : {})}
    >
      <Box
        _focusWithin={{
          outline: '3px solid',
          outlineColor: 'gold.400',
          outlineOffset: '3px',
        }}
        borderColor="border"
        borderRadius="md"
        borderWidth="1px"
        className="poster-hover group"
        overflow="hidden"
        position="relative"
      >
        <Link
          aria-label={`Open ${label}`}
          href={href}
          onClick={() =>
            trackEvent({
              eventName: `${mediaType}: ${label} - ${id}`,
              eventData: { type: 'navigate' },
            })
          }
          prefetch={prefetch}
        >
          <AspectRatio ratio={2 / 3}>
            <PosterImage alt={`${label} poster`} src={imageUrl} />
          </AspectRatio>
        </Link>
        {showStatusBadge ? (
          <Badge
            bg="gold.400"
            bottom={2}
            color="gray.900"
            left={2}
            position="absolute"
            textTransform="none"
          >
            {status}
          </Badge>
        ) : null}
        {/* Library and favourite quick actions live on the artwork itself, so
            every movie and TV item behaves the same wherever it is listed. */}
        {isTrackable ? (
          <MediaQuickActions
            mediaType={mediaType}
            showAddedBadge={libraryBadges && !status}
            title={label}
            tmdbId={id}
          />
        ) : null}
        {hasProgress ? (
          <PosterProgressBar label={label} value={progress} />
        ) : null}
      </Box>
      <Text
        asChild
        fontSize={{ base: 'xs', md: 'sm' }}
        fontWeight="600"
        lineClamp={2}
        lineHeight="1.25"
        minHeight={{ base: '2rem', md: '2.5rem' }}
      >
        <Link href={href} prefetch={prefetch}>
          {label}
        </Link>
      </Text>
      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  );
};

export default PosterCard;
