import {
  Avatar,
  Box,
  Button,
  Field,
  Flex,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { ProfileStatRail } from 'lib/components/profile/ProfileStatRail';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import {
  formatWatchTime,
  type ProfileStatistics,
} from 'lib/features/profile/profile-statistics';
import { FollowButton } from 'lib/features/social/follow-button';
import type { SocialProfileList } from 'lib/services/database/social.server';
import type { Route } from 'next';
import Link from 'next/link';

export const ProfileConnectionsPage = ({
  data,
  comparisons = {},
  isAuthenticated,
  kind,
  search,
  showComparisons = false,
}: {
  data: SocialProfileList;
  comparisons?: Record<string, ProfileStatistics>;
  isAuthenticated: boolean;
  kind: 'followers' | 'following';
  search: string;
  showComparisons?: boolean;
}) => {
  const title = kind === 'followers' ? 'Followers' : 'Following';
  const pagePath = `/profile/${data.profile.username}/${kind}`;
  const getPageHref = (page: number) => {
    const query = new URLSearchParams();

    if (search) {
      query.set('q', search);
    }

    if (showComparisons) {
      query.set('compare', 'statistics');
    }

    if (page > 1) {
      query.set('page', String(page));
    }

    const queryString = query.toString();

    return `${pagePath}${queryString ? `?${queryString}` : ''}` as Route;
  };
  const callbackUrl = getPageHref(data.pagination.page);

  return (
    <PageShell size="narrow">
      <PageHeading
        actions={
          <Button asChild variant="outline">
            <Link
              href={
                (data.isOwnProfile
                  ? '/profile'
                  : `/profile/${data.profile.username}`) as Route
              }
            >
              Back to Profile
            </Link>
          </Button>
        }
        subtitle={`${title} for @${data.profile.username}`}
        title={title}
      />

      <form action={pagePath} method="get">
        <Flex align="end" gap={3}>
          {showComparisons ? (
            <input name="compare" type="hidden" value="statistics" />
          ) : null}
          <Field.Root>
            <Field.Label>Search users</Field.Label>
            <Input
              defaultValue={search}
              maxLength={80}
              name="q"
              placeholder="Display name or username"
              type="search"
            />
          </Field.Root>
          <Button type="submit">Search</Button>
        </Flex>
      </form>

      {data.items.length > 0 ? (
        <Stack gap={3} role="list">
          {data.items.map((item) => {
            const displayName = item.display_name || item.username;

            const comparison = comparisons[item.username];

            return (
              <Stack
                _hover={{ borderColor: 'gold.400' }}
                borderColor="border"
                borderRadius="lg"
                borderWidth="1px"
                gap={4}
                key={item.username}
                padding={4}
                role="listitem"
                transitionDuration="fast"
                transitionProperty="border-color"
                transitionTimingFunction="ease-out"
              >
                <Flex align="center" gap={4}>
                  <Avatar.Root size="md">
                    <Avatar.Fallback name={displayName} />
                  </Avatar.Root>
                  <Box asChild flex="1" minWidth={0}>
                    <Link
                      aria-label={`Open ${displayName}'s profile`}
                      href={`/profile/${item.username}` as Route}
                    >
                      <Text fontWeight="semibold" truncate>
                        {displayName}
                      </Text>
                      <Text color="fg.muted" fontSize="sm" truncate>
                        @{item.username}
                      </Text>
                    </Link>
                  </Box>
                  {item.is_current_user ? (
                    <Text color="fg.muted" fontSize="sm" fontWeight="semibold">
                      You
                    </Text>
                  ) : (
                    <FollowButton
                      callbackUrl={callbackUrl}
                      initialIsFollowing={Boolean(item.is_following)}
                      isAuthenticated={isAuthenticated}
                      isOwnProfile={false}
                      username={item.username}
                    />
                  )}
                </Flex>
                {comparison ? (
                  <ProfileStatRail
                    cards={[
                      {
                        label: 'Movies Watched',
                        value: comparison.moviesWatched,
                      },
                      {
                        detail:
                          comparison.missingMovieRuntimeCount > 0
                            ? 'Partial total; runtime data is unavailable.'
                            : undefined,
                        label: 'Movie Time',
                        value: formatWatchTime(comparison.movieMinutesWatched),
                      },
                      {
                        label: 'TV Shows Watched',
                        value: comparison.tvShowsWatched,
                      },
                      {
                        detail:
                          comparison.missingTvRuntimeCount > 0
                            ? 'Partial total; runtime data is unavailable.'
                            : undefined,
                        label: 'TV Time',
                        value: formatWatchTime(comparison.tvMinutesWatched),
                      },
                      {
                        label: 'Episodes Watched',
                        value: comparison.episodesWatched,
                      },
                    ]}
                  />
                ) : null}
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <StatePanel
          message={
            search
              ? `No ${title.toLowerCase()} match “${search}”.`
              : `This profile has no visible ${title.toLowerCase()} yet.`
          }
        />
      )}

      {data.pagination.totalPages > 1 ? (
        <Flex
          align="center"
          aria-label={`${title} pagination`}
          as="nav"
          justify="space-between"
        >
          {data.pagination.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={getPageHref(data.pagination.page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Box />
          )}
          <Text color="fg.muted" fontSize="sm" role="status">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </Text>
          {data.pagination.page < data.pagination.totalPages ? (
            <Button asChild variant="outline">
              <Link href={getPageHref(data.pagination.page + 1)}>Next</Link>
            </Button>
          ) : (
            <Box />
          )}
        </Flex>
      ) : null}
    </PageShell>
  );
};
