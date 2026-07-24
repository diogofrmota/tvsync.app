import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import {
  type ProfileStatCard,
  ProfileStatRail,
} from 'lib/components/profile/ProfileStatRail';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import {
  formatWatchTime,
  type ProfileStatistics,
} from 'lib/features/profile/profile-statistics';
import { LogoutButton } from 'lib/pages/auth/client-actions';
import type { AuthSessionIssue } from 'lib/services/auth/session-error.server';
import type { FollowCountsRow } from 'lib/services/database/social.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import type { Route } from 'next';
import Link from 'next/link';
import { FiEdit3 } from 'react-icons/fi';

export const ProfileAccessIssue = ({ issue }: { issue: AuthSessionIssue }) => (
  <PageShell size="narrow">
    <Box borderColor="red.300" borderRadius="md" borderWidth="1px" padding={5}>
      <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }} marginBottom={3}>
        {issue.title}
      </Heading>
      <Text color="fg.muted" marginBottom={5}>
        {issue.description}
      </Text>
      <Button asChild variant="solid">
        <Link href={'/login?callbackUrl=/profile' as Route}>Log in again</Link>
      </Button>
    </Box>
  </PageShell>
);

const runtimeDetail = (missingCount: number) => {
  if (missingCount === 0) {
    return undefined;
  }

  return `Partial total: ${missingCount} ${
    missingCount === 1 ? 'runtime is' : 'runtimes are'
  } unavailable.`;
};

const FavoriteSection = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: Array<ProfileFavoriteItem>;
  title: string;
}) => (
  <Stack gap={4}>
    <SectionHeading title={title} />
    {items.length > 0 ? (
      <Flex
        aria-label={title}
        gap={4}
        overflowX="auto"
        paddingBottom={3}
        role="list"
      >
        {items.map((item, index) => (
          <Box key={`${item.mediaType}-${item.id}`} role="listitem">
            <PosterCard
              id={item.id}
              imageUrl={item.posterPath}
              isLastItem={index === items.length - 1}
              layout="flex"
              mediaType={item.mediaType}
              name={item.name}
            />
          </Box>
        ))}
      </Flex>
    ) : (
      <StatePanel message={emptyMessage} />
    )}
  </Stack>
);

// Follow counts read as compact, obviously tappable chips so the identity
// header stays one short block instead of a stacked number/label column.
const FollowCountChip = ({
  href,
  label,
  value,
}: {
  href: Route;
  label: string;
  value: number;
}) => (
  <Box
    _hover={{ borderColor: 'gold.400', color: 'gold.300' }}
    alignItems="center"
    asChild
    borderColor="border"
    borderRadius="full"
    borderWidth="1px"
    display="inline-flex"
    fontSize="sm"
    gap={1.5}
    paddingX={3}
    paddingY={1}
    transitionDuration="fast"
    transitionProperty="border-color, color"
    transitionTimingFunction="ease-out"
  >
    <Link href={href}>
      <Text as="span" fontWeight="bold">
        {value}
      </Text>
      <Text as="span" color="fg.muted">
        {label}
      </Text>
    </Link>
  </Box>
);

export const ProfilePage = ({
  favorites,
  followCounts,
  profile,
  statistics,
}: {
  favorites: Array<ProfileFavoriteItem>;
  followCounts: FollowCountsRow;
  profile: OwnProfile;
  statistics: ProfileStatistics;
}) => {
  const displayName = profile.display_name || profile.name || profile.username;
  const baseProfilePath = `/profile/${profile.username}`;
  const statCards: Array<ProfileStatCard> = [
    { label: 'Movies Watched', value: statistics.moviesWatched },
    {
      detail: runtimeDetail(statistics.missingMovieRuntimeCount),
      label: 'Time in Movies',
      value: formatWatchTime(statistics.movieMinutesWatched),
    },
    { label: 'TV Shows Watched', value: statistics.tvShowsWatched },
    {
      detail: runtimeDetail(statistics.missingTvRuntimeCount),
      label: 'Time in TV Shows',
      value: formatWatchTime(statistics.tvMinutesWatched),
    },
    { label: 'Episodes Watched', value: statistics.episodesWatched },
    { label: 'Number of Reviews', value: statistics.reviewsWritten },
  ];
  const favoriteMovies = favorites.filter((item) => item.mediaType === 'movie');
  const favoriteTvShows = favorites.filter((item) => item.mediaType === 'tv');

  return (
    <PageShell>
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 4, md: 6 }}
        justify="space-between"
        paddingX={{ base: 4, md: 6 }}
        paddingY={{ base: 4, md: 5 }}
      >
        <Stack gap={2} minWidth={0}>
          <Flex align="baseline" columnGap={3} rowGap={1} wrap="wrap">
            <Heading as="h1" fontSize={{ base: 'xl', md: '2xl' }}>
              {displayName}
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              @{profile.username}
            </Text>
          </Flex>

          <Flex gap={2} wrap="wrap">
            <FollowCountChip
              href={`${baseProfilePath}/following` as Route}
              label="Following"
              value={followCounts.following_count}
            />
            <FollowCountChip
              href={`${baseProfilePath}/followers` as Route}
              label="Followers"
              value={followCounts.follower_count}
            />
          </Flex>

          {profile.bio ? (
            <Text color="fg.muted" fontSize="sm">
              {profile.bio}
            </Text>
          ) : null}
        </Stack>

        <Flex flexShrink={0} gap={3}>
          <Button asChild size="sm">
            <Link href="/profile/edit">
              <FiEdit3 aria-hidden />
              Edit Profile
            </Link>
          </Button>
          <LogoutButton />
        </Flex>
      </Flex>

      <FavoriteSection
        emptyMessage="You have not added any favourite movies."
        items={favoriteMovies}
        title="Favourite Movies"
      />
      <FavoriteSection
        emptyMessage="You have not added any favourite TV shows."
        items={favoriteTvShows}
        title="Favourite TV Shows"
      />

      <Stack gap={4}>
        <SectionHeading title="Statistics" />
        <ProfileStatRail cards={statCards} />
        <Button alignSelf="center" asChild size="sm" variant="outline">
          <Link
            href={`${baseProfilePath}/following?compare=statistics` as Route}
          >
            Compare with Following
          </Link>
        </Button>
      </Stack>
    </PageShell>
  );
};
