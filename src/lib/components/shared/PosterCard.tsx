'use client';

import {
  AspectRatio,
  Badge,
  Box,
  Progress,
  Stack,
  Text,
} from '@chakra-ui/react';
import PosterImage from 'lib/components/shared/PosterImage';
import type { MediaType } from 'lib/types';
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
  mediaType: MediaType;
  name?: string;
  prefetch?: boolean;
  progress?: number;
  status?: string | null;
};

const PosterCard = ({
  actions,
  id,
  imageUrl,
  isLastItem,
  layout,
  mediaType,
  name,
  prefetch = true,
  progress,
  status,
}: PosterCardProps) => {
  const label = name?.trim() || 'Untitled title';
  const href = `${pathMap[mediaType]}/${id}` as Route;

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
        {status ? (
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
      {typeof progress === 'number' ? (
        <Stack gap={1}>
          <Progress.Root
            aria-label={`${label} progress`}
            max={100}
            size="xs"
            value={Math.max(0, Math.min(progress, 100))}
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text color="gray.300" fontSize="xs">
            {Math.round(progress)}% watched
          </Text>
        </Stack>
      ) : null}
      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  );
};

export default PosterCard;
