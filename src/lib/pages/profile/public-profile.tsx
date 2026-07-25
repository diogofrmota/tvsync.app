import { Avatar, Box, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { ProfileStatRail } from 'lib/components/profile/ProfileStatRail';
import { MediaRail } from 'lib/components/shared/MediaRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import type { PublicProfileData } from 'lib/features/profile';
import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import { FollowButton } from 'lib/features/social/follow-button';
import { getProfileStatCards } from 'lib/pages/profile/statistics';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

// Public favourites use the same rail as every other list in the app.
const Favorites = ({
  emptyMessage,
  items,
  mediaType,
  seeAllHref,
  title,
}: {
  emptyMessage: string;
  items: Array<ProfileFavoriteItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: string;
}) => (
  <MediaRail
    fallback={items.length === 0 ? <StatePanel message={emptyMessage} /> : null}
    items={items}
    mediaType={mediaType}
    seeAllHref={seeAllHref}
    title={title}
  />
);

export const PublicProfilePage = ({ data }: { data: PublicProfileData }) => {
  const { profile } = data;
  const displayName = profile.display_name || profile.username;
  const profilePath = `/profile/${profile.username}`;
  const favoriteMovies = data.favorites.filter(
    (item) => item.mediaType === MediaType.Movie
  );
  const favoriteTvShows = data.favorites.filter(
    (item) => item.mediaType === MediaType.Tv
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
        <ProfileStatRail cards={getProfileStatCards(data.statistics)} />
      </Stack>

      <Favorites
        emptyMessage="No favourite TV shows are public yet."
        items={favoriteTvShows}
        mediaType={MediaType.Tv}
        seeAllHref={`${profilePath}/favorites/tv-shows` as Route}
        title="❤️ Favourite TV Shows"
      />
      <Favorites
        emptyMessage="No favourite movies are public yet."
        items={favoriteMovies}
        mediaType={MediaType.Movie}
        seeAllHref={`${profilePath}/favorites/movies` as Route}
        title="❤️ Favourite Movies"
      />
    </PageShell>
  );
};
