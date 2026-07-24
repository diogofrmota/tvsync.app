import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import {
  type ProfileStatCard,
  ProfileStatRail,
} from 'lib/components/profile/ProfileStatRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
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
      label: 'Time Spent Watching Movies',
      value: formatWatchTime(statistics.movieMinutesWatched),
    },
    { label: 'TV Shows Watched', value: statistics.tvShowsWatched },
    {
      detail: runtimeDetail(statistics.missingTvRuntimeCount),
      label: 'Time Spent Watching TV Shows',
      value: formatWatchTime(statistics.tvMinutesWatched),
    },
    { label: 'Episodes Watched', value: statistics.episodesWatched },
  ];
  const favoriteMovies = favorites.filter((item) => item.mediaType === 'movie');
  const favoriteTvShows = favorites.filter((item) => item.mediaType === 'tv');

  return (
    <PageShell>
      <PageHeading
        subtitle="Your profile information, social connections and statistics."
        title="Profile"
      />

      <Box
        alignSelf="center"
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        maxWidth="26rem"
        paddingX={{ base: 5, md: 6 }}
        paddingY={{ base: 6, md: 7 }}
        width="full"
      >
        <Stack align="center" gap={5} textAlign="center">
          <Stack gap={1}>
            <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }}>
              {displayName}
            </Heading>
            <Text color="fg.muted">@{profile.username}</Text>
          </Stack>

          <Flex gap={8} justify="center">
            <Box asChild>
              <Link href={`${baseProfilePath}/following` as Route}>
                <Stack align="center" gap={0}>
                  <Text fontSize="xl" fontWeight="bold">
                    {followCounts.following_count}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    Following
                  </Text>
                </Stack>
              </Link>
            </Box>
            <Box asChild>
              <Link href={`${baseProfilePath}/followers` as Route}>
                <Stack align="center" gap={0}>
                  <Text fontSize="xl" fontWeight="bold">
                    {followCounts.follower_count}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    Followers
                  </Text>
                </Stack>
              </Link>
            </Box>
          </Flex>

          {profile.bio ? (
            <Text color="fg.muted" fontSize="sm">
              {profile.bio}
            </Text>
          ) : null}

          <Flex gap={3}>
            <Button asChild size="sm">
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
            <LogoutButton />
          </Flex>
        </Stack>
      </Box>

      <FavoriteSection
        emptyMessage="You have not added any favourite movies yet."
        items={favoriteMovies}
        title="Favourite Movies"
      />
      <FavoriteSection
        emptyMessage="You have not added any favourite TV shows yet."
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
