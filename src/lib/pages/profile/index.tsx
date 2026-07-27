import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { ProfileReviewList } from 'lib/components/profile/ProfileReviews';
import { ProfileStatRail } from 'lib/components/profile/ProfileStatRail';
import { FavoriteHeartIcon } from 'lib/components/shared/FavoriteHeart';
import { MediaRail } from 'lib/components/shared/MediaRail';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import { PageShell } from 'lib/components/shared/PageShell';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import type { ProfileReviewItem } from 'lib/features/profile/profile-reviews.server';
import type { ProfileStatistics } from 'lib/features/profile/profile-statistics';
import { ProfileAvatarPicker } from 'lib/pages/profile/profile-avatar-picker';
import { ProfileHeaderActions } from 'lib/pages/profile/profile-header-actions';
import { getProfileStatCards } from 'lib/pages/profile/statistics';
import type { AuthSessionIssue } from 'lib/services/auth/session-error.server';
import type { FollowCountsRow } from 'lib/services/database/social.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

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

/**
 * Every profile list is the same horizontally scrollable rail used by Home and
 * Explore: the first titles, a trailing "See All" tile, and a "See All" action
 * aligned with the section title. Everything on your own profile is already in
 * your library, so the library chips are dropped here.
 */
const ProfileRail = ({
  emptyMessage,
  items,
  mediaType,
  seeAllHref,
  title,
  titleIcon,
}: {
  emptyMessage: string;
  items: Array<MediaCardItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: ComponentProps<typeof Link>['href'];
  title: string;
  titleIcon?: ReactNode;
}) => (
  <MediaRail
    fallback={items.length === 0 ? <StatePanel message={emptyMessage} /> : null}
    items={items}
    libraryBadges={false}
    mediaType={mediaType}
    seeAllHref={seeAllHref}
    title={title}
    titleIcon={titleIcon}
  />
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
    _hover={{ background: 'gray.100', borderColor: 'gold.400' }}
    alignItems="center"
    asChild
    background="white"
    borderColor="border"
    borderRadius="full"
    borderWidth="1px"
    color="black"
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
      <Text as="span" color="gray.600">
        {label}
      </Text>
    </Link>
  </Box>
);

export const ProfilePage = ({
  favorites,
  followCounts,
  movies,
  profile,
  reviews,
  statistics,
  tvShows,
}: {
  favorites: Array<ProfileFavoriteItem>;
  followCounts: FollowCountsRow;
  movies: Array<MediaCardItem>;
  profile: OwnProfile;
  reviews: Array<ProfileReviewItem>;
  statistics: ProfileStatistics;
  tvShows: Array<MediaCardItem>;
}) => {
  const displayName = profile.display_name || profile.name || profile.username;
  const baseProfilePath = `/profile/${profile.username}`;
  const favoriteMovies = favorites.filter(
    (item) => item.mediaType === MediaType.Movie
  );
  const favoriteTvShows = favorites.filter(
    (item) => item.mediaType === MediaType.Tv
  );

  return (
    <PageShell>
      <Stack gap={{ base: 3, md: 4 }}>
        <Flex justify="flex-end">
          <ProfileHeaderActions />
        </Flex>

        <Stack align="center" gap={3} textAlign="center">
          {/* The avatar is a poster the user picks in search, so it opens the
              picker dialog on click instead of an upload control. */}
          <ProfileAvatarPicker
            avatarPath={profile.profile_avatar_path}
            avatarTitle={profile.profile_avatar_title}
            displayName={displayName}
          />

          <Stack align="center" gap={0.5}>
            <Heading fontSize={{ base: 'lg', md: 'xl' }}>{displayName}</Heading>
            <Text color="fg.muted" fontSize="sm">
              @{profile.username}
            </Text>
          </Stack>

          <Flex gap={2} justify="center" wrap="wrap">
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
            <Text color="fg.muted" fontSize="sm" maxWidth="42rem">
              {profile.bio}
            </Text>
          ) : null}
        </Stack>
      </Stack>

      <Stack as="section" gap={5}>
        <SectionHeading
          seeAllHref={'/profile/statistics' as Route}
          title="Statistics"
        />
        <ProfileStatRail cards={getProfileStatCards(statistics)} />
      </Stack>

      <Stack as="section" gap={5}>
        <SectionHeading
          seeAllHref={
            reviews.length > 0 ? ('/profile/reviews' as Route) : undefined
          }
          title="Reviews"
        />
        {reviews.length > 0 ? (
          <ProfileReviewList reviews={reviews} />
        ) : (
          <StatePanel message="You have not written a review yet. Rate a show or film and add a review from its page." />
        )}
      </Stack>

      <ProfileRail
        emptyMessage="You have not added any TV shows to your library yet."
        items={tvShows}
        mediaType={MediaType.Tv}
        seeAllHref={'/tv-shows' as Route}
        title="TV Shows"
      />
      <ProfileRail
        emptyMessage="You have not added any favourite TV shows."
        items={favoriteTvShows}
        mediaType={MediaType.Tv}
        seeAllHref={'/profile/favorites/tv-shows' as Route}
        title="Favourite TV Shows"
        titleIcon={<FavoriteHeartIcon />}
      />
      <ProfileRail
        emptyMessage="You have not added any movies to your library yet."
        items={movies}
        mediaType={MediaType.Movie}
        seeAllHref={'/movies' as Route}
        title="Movies"
      />
      <ProfileRail
        emptyMessage="You have not added any favourite movies."
        items={favoriteMovies}
        mediaType={MediaType.Movie}
        seeAllHref={'/profile/favorites/movies' as Route}
        title="Favourite Movies"
        titleIcon={<FavoriteHeartIcon />}
      />
    </PageShell>
  );
};
