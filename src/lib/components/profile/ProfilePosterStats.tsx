'use client';

import { Flex, Icon, Text } from '@chakra-ui/react';
import type { ProfileStatistics } from 'lib/features/profile/profile-statistics';
import { formatWatchTime } from 'lib/features/profile/profile-statistics';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import { FiClock, FiEdit3, FiFilm, FiTv } from 'react-icons/fi';

const PosterStat = ({
  icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: number | string;
}) => (
  <Flex
    _hover={{ background: 'gray.100' }}
    align="center"
    aria-label={`${label}: ${value}`}
    asChild
    background="white"
    borderRadius="md"
    color="black"
    gap={1.5}
    minHeight="2rem"
    paddingX={{ base: 2, md: 3 }}
    paddingY={1}
  >
    <Link href="/profile/statistics">
      <Icon as={icon} boxSize={4} />
      <Text as="span" fontSize="sm" fontWeight="bold">
        {value}
      </Text>
    </Link>
  </Flex>
);

export const ProfileSummaryStats = ({
  statistics,
}: {
  statistics: ProfileStatistics;
}) => (
  <Flex gap={{ base: 1.5, md: 2 }} justify="center" width="full" wrap="wrap">
    <PosterStat
      icon={FiTv}
      label="TV Shows Finished"
      value={statistics.tvShowsWatched}
    />
    <PosterStat
      icon={FiFilm}
      label="Movies Finished"
      value={statistics.moviesWatched}
    />
    <PosterStat
      icon={FiClock}
      label="Total Watch Time"
      value={formatWatchTime(
        statistics.tvMinutesWatched + statistics.movieMinutesWatched
      )}
    />
    <PosterStat
      icon={FiEdit3}
      label="Number of Reviews"
      value={statistics.reviewsWritten}
    />
  </Flex>
);
