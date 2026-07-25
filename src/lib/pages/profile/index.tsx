import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import {
  type ProfileStatCard,
  ProfileStatRail,
} from 'lib/components/profile/ProfileStatRail';
import { MediaRail } from 'lib/components/shared/MediaRail';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { SectionHeading, StatePanel } from 'lib/components/shared/Section';
import { CreateCustomListForm } from 'lib/features/lists/create-list-form';
import {
  type CustomListWithItems,
  getCustomListHref,
} from 'lib/features/lists/types';
import type { ProfileFavoriteItem } from 'lib/features/profile/profile-favorites.server';
import type { ProfileStatistics } from 'lib/features/profile/profile-statistics';
import { LogoutButton } from 'lib/pages/auth/client-actions';
import type { AuthSessionIssue } from 'lib/services/auth/session-error.server';
import type { FollowCountsRow } from 'lib/services/database/social.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentProps } from 'react';
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

/**
 * Every profile list is the same horizontally scrollable rail used by Home and
 * Explore: the first titles, a trailing "See All" tile, and a "See All" action
 * aligned with the section title.
 */
const ProfileRail = ({
  emptyMessage,
  items,
  mediaType,
  seeAllHref,
  title,
}: {
  emptyMessage: string;
  items: Array<MediaCardItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: ComponentProps<typeof Link>['href'];
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
  customLists,
  favorites,
  followCounts,
  movies,
  profile,
  statistics,
  tvShows,
}: {
  customLists: Array<CustomListWithItems>;
  favorites: Array<ProfileFavoriteItem>;
  followCounts: FollowCountsRow;
  movies: Array<MediaCardItem>;
  profile: OwnProfile;
  statistics: ProfileStatistics;
  tvShows: Array<MediaCardItem>;
}) => {
  const displayName = profile.display_name || profile.name || profile.username;
  const baseProfilePath = `/profile/${profile.username}`;
  // The profile keeps the two headline counters; every other statistic lives
  // behind "See All" on the dedicated statistics page.
  const statCards: Array<ProfileStatCard> = [
    { label: 'TV Shows Watched', value: statistics.tvShowsWatched },
    { label: 'Movies Watched', value: statistics.moviesWatched },
  ];
  const favoriteMovies = favorites.filter(
    (item) => item.mediaType === MediaType.Movie
  );
  const favoriteTvShows = favorites.filter(
    (item) => item.mediaType === MediaType.Tv
  );

  return (
    <PageShell>
      {/* The route title leads the page exactly like Movies and TV Shows, with
          the account actions on the same horizontal line. */}
      <PageHeading
        actions={
          <Flex gap={3}>
            <Button asChild size="sm">
              <Link href="/profile/edit">
                <FiEdit3 aria-hidden />
                Edit Profile
              </Link>
            </Button>
            <LogoutButton />
          </Flex>
        }
        title="Profile"
      />

      {/* Identity reads as one centred block: no avatar image of any kind, just
          the name, handle, follow counts, and biography. */}
      <Stack
        align="center"
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        gap={3}
        paddingX={{ base: 4, md: 6 }}
        paddingY={{ base: 5, md: 6 }}
        textAlign="center"
      >
        <Stack align="center" gap={1}>
          <Heading fontSize={{ base: 'xl', md: '2xl' }}>{displayName}</Heading>
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

      <Stack as="section" gap={5}>
        <SectionHeading
          seeAllHref={'/profile/statistics' as Route}
          title="Statistics"
        />
        <ProfileStatRail cards={statCards} />
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
        title="❤️ Favourite TV Shows"
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
        title="❤️ Favourite Movies"
      />

      <Stack as="section" gap={5}>
        <SectionHeading
          seeAllHref={'/profile/lists' as Route}
          title="Personalized Lists"
        />
        <CreateCustomListForm />
        {customLists.length > 0 ? (
          customLists.map((list) => (
            <ProfileRail
              emptyMessage="This list is empty. Open it to add titles from your library."
              items={list.items}
              key={list.id}
              mediaType={MediaType.Movie}
              seeAllHref={getCustomListHref(list.id) as Route}
              title={list.name}
            />
          ))
        ) : (
          <StatePanel message="You have not created a personalized list yet. Name one above to get started." />
        )}
      </Stack>
    </PageShell>
  );
};
