import { Avatar, Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import {
  type ProfileStatCard,
  ProfileStatRail,
} from 'lib/components/profile/ProfileStatRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import type { PublicProfileData } from 'lib/features/profile';
import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import {
  formatWatchTime,
  type ProfileStatistics,
} from 'lib/features/profile/profile-statistics';
import { FollowButton } from 'lib/features/social/follow-button';
import type { Route } from 'next';
import Link from 'next/link';

const runtimeDetail = (missingCount: number) =>
  missingCount > 0
    ? `Partial total: ${missingCount} ${
        missingCount === 1 ? 'runtime is' : 'runtimes are'
      } unavailable.`
    : undefined;

const getStatCards = (
  statistics: ProfileStatistics
): Array<ProfileStatCard> => [
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

const Favorites = ({
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
      <Flex gap={4} overflowX="auto" paddingBottom={3} role="list">
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

export const PublicProfilePage = ({ data }: { data: PublicProfileData }) => {
  const { profile } = data;
  const displayName = profile.display_name || profile.username;
  const profilePath = `/profile/${profile.username}`;
  const favoriteMovies = data.favorites.filter(
    (item) => item.mediaType === 'movie'
  );
  const favoriteTvShows = data.favorites.filter(
    (item) => item.mediaType === 'tv'
  );

  return (
    <PageShell>
      <PageHeading
        subtitle="Public profile information."
        title="User Profile"
      />

      <Flex
        align={{ base: 'flex-start', sm: 'center' }}
        borderColor="border"
        borderRadius="lg"
        borderWidth="1px"
        direction={{ base: 'column', sm: 'row' }}
        gap={5}
        padding={5}
      >
        <Avatar.Root aria-label={`${displayName} profile avatar`} size="2xl">
          <Avatar.Fallback name={displayName} />
        </Avatar.Root>
        <Stack flex="1" gap={2} minWidth={0}>
          <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }}>
            {displayName}
          </Heading>
          <Text color="fg.muted">@{profile.username}</Text>
          <Text color="fg.muted">
            {profile.bio || 'This TvSync profile has no biography yet.'}
          </Text>
        </Stack>
        <FollowButton
          callbackUrl={profilePath}
          initialIsFollowing={data.followState.is_following}
          isAuthenticated={data.isAuthenticated}
          isOwnProfile={data.isOwnProfile}
          username={profile.username}
        />
      </Flex>

      <Stack gap={4}>
        <SectionHeading title="Social Information" />
        <Flex gap={4}>
          <Box
            _hover={{ borderColor: 'gold.400' }}
            asChild
            borderColor="border"
            borderRadius="lg"
            borderWidth="1px"
            flex="1"
            padding={5}
            transitionDuration="fast"
            transitionProperty="border-color"
            transitionTimingFunction="ease-out"
          >
            <Link href={`${profilePath}/following` as Route}>
              <Text fontSize="2xl" fontWeight="bold">
                {data.followState.following_count}
              </Text>
              <Text color="fg.muted">Following</Text>
            </Link>
          </Box>
          <Box
            _hover={{ borderColor: 'gold.400' }}
            asChild
            borderColor="border"
            borderRadius="lg"
            borderWidth="1px"
            flex="1"
            padding={5}
            transitionDuration="fast"
            transitionProperty="border-color"
            transitionTimingFunction="ease-out"
          >
            <Link href={`${profilePath}/followers` as Route}>
              <Text fontSize="2xl" fontWeight="bold">
                {data.followState.follower_count}
              </Text>
              <Text color="fg.muted">Followers</Text>
            </Link>
          </Box>
        </Flex>
      </Stack>

      <Stack gap={4}>
        <SectionHeading title="Statistics" />
        <ProfileStatRail cards={getStatCards(data.statistics)} />
      </Stack>

      <Favorites
        emptyMessage="No favourite movies are public yet."
        items={favoriteMovies}
        title="Favourite Movies"
      />
      <Favorites
        emptyMessage="No favourite TV shows are public yet."
        items={favoriteTvShows}
        title="Favourite TV Shows"
      />
    </PageShell>
  );
};
