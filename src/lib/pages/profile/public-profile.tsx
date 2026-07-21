import {
  Avatar,
  Badge,
  Box,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import PosterCard from 'lib/components/shared/PosterCard';
import type {
  PublicProfileData,
  PublicProfileMediaItem,
  PublicProfileReviewItem,
} from 'lib/features/profile';
import { FollowButton } from 'lib/features/social/follow-button';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

type PublicProfilePageProps = {
  data: PublicProfileData;
};

type MediaSectionProps = {
  emptyText: string;
  items: Array<PublicProfileMediaItem>;
  title: string;
};

type ReviewCardProps = {
  review: PublicProfileReviewItem;
};

const avatarPalettes = ['teal', 'cyan', 'blue', 'green', 'pink', 'orange'];

const getGeneratedAvatarPalette = (text: string) => {
  const hash = Array.from(text).reduce(
    (value, character) => value + character.charCodeAt(0),
    0
  );

  return avatarPalettes[hash % avatarPalettes.length];
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const getMediaHref = (mediaType: MediaType.Movie | MediaType.Tv, id: number) =>
  (mediaType === MediaType.Movie ? `/movie/${id}` : `/tv/show/${id}`) as Route;

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <Box
    borderColor="border"
    borderRadius="md"
    borderStyle="dashed"
    borderWidth="1px"
    padding={6}
  >
    <Text color="fg.muted">{children}</Text>
  </Box>
);

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <Box borderColor="border" borderRadius="md" borderWidth="1px" padding={4}>
    <Text color="fg.muted" fontSize="sm">
      {label}
    </Text>
    <Text fontSize="2xl" fontWeight="bold">
      {value}
    </Text>
  </Box>
);

const FollowList = ({
  items,
  title,
}: {
  items: PublicProfileData['followState']['followers'];
  title: string;
}) => (
  <VStack align="stretch" gap={3}>
    <Heading as="h2" fontSize="md">
      {title}
    </Heading>
    {items.length > 0 ? (
      <VStack align="stretch" gap={2}>
        {items.slice(0, 8).map((item) => (
          <HStack asChild gap={3} key={item.user_id}>
            <Link href={`/profile/${item.username}` as Route}>
              <Avatar.Root
                aria-label={`${item.display_name || item.username} profile avatar`}
                size="sm"
              >
                <Avatar.Fallback name={item.display_name || item.username} />
              </Avatar.Root>
              <Box minWidth={0}>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  wordBreak="break-word"
                >
                  {item.display_name || item.username}
                </Text>
                <Text color="fg.muted" fontSize="xs">
                  @{item.username}
                </Text>
              </Box>
            </Link>
          </HStack>
        ))}
      </VStack>
    ) : (
      <Text color="fg.muted" fontSize="sm">
        No public users here yet.
      </Text>
    )}
  </VStack>
);

const MediaSection = ({ emptyText, items, title }: MediaSectionProps) => (
  <VStack align="stretch" gap={4}>
    <Heading as="h2" fontSize="xl">
      {title}
    </Heading>
    {items.length > 0 ? (
      <Grid
        columnGap={6}
        rowGap={10}
        templateColumns={['repeat(2, 1fr)', 'repeat(4, 1fr)']}
      >
        {items.map((item) => (
          <PosterCard
            id={item.tmdbId}
            imageUrl={item.posterPath}
            key={`${item.mediaType}-${item.tmdbId}`}
            layout="grid"
            mediaType={item.mediaType}
            name={item.title}
          />
        ))}
      </Grid>
    ) : (
      <EmptyState>{emptyText}</EmptyState>
    )}
  </VStack>
);

const ReviewCard = ({ review }: ReviewCardProps) => (
  <Box borderColor="border" borderRadius="md" borderWidth="1px" padding={5}>
    <VStack align="stretch" gap={3}>
      <HStack flexWrap="wrap" gap={2}>
        <Badge textTransform="none" variant="surface">
          {review.mediaType === MediaType.Movie ? 'Movie' : 'TV Show'}
        </Badge>
        <Text color="fg.muted" fontSize="sm">
          {formatDate(review.updatedAt)}
        </Text>
      </HStack>
      <Box>
        <Heading as="h3" fontSize="md">
          {review.title || 'Untitled review'}
        </Heading>
        <Text asChild color="fg.muted" fontSize="sm">
          <Link href={getMediaHref(review.mediaType, review.tmdbId)}>
            {review.mediaTitle}
          </Link>
        </Text>
      </Box>
      <Text lineClamp={5} whiteSpace="pre-wrap">
        {review.body}
      </Text>
    </VStack>
  </Box>
);

export const PublicProfilePage = ({ data }: PublicProfilePageProps) => {
  const { profile } = data;
  const avatarName = profile.display_name || profile.name || profile.username;
  const avatarPalette = getGeneratedAvatarPalette(
    `${profile.username}:${avatarName}`
  );

  return (
    <Grid gap={10} marginX="auto" maxWidth="72rem" paddingX={8}>
      <Grid
        alignItems="center"
        gap={6}
        templateColumns={['1fr', 'auto minmax(0, 1fr)']}
      >
        <Avatar.Root
          aria-label={`${avatarName} profile avatar`}
          colorPalette={avatarPalette}
          size="2xl"
        >
          <Avatar.Fallback name={avatarName} />
        </Avatar.Root>

        <VStack align="stretch" gap={3}>
          <HStack flexWrap="wrap" gap={3}>
            <Heading as="h1" fontSize={['2xl', '4xl']} wordBreak="break-word">
              {profile.display_name}
            </Heading>
            <Badge textTransform="none" variant="subtle">
              @{profile.username}
            </Badge>
          </HStack>
          {profile.bio ? (
            <Text color="fg.muted" maxWidth="48rem" whiteSpace="pre-wrap">
              {profile.bio}
            </Text>
          ) : (
            <Text color="fg.muted">This TVSync profile has no bio yet.</Text>
          )}
          <HStack align="center" flexWrap="wrap" gap={4}>
            <FollowButton
              initialIsFollowing={data.followState.is_following}
              isOwnProfile={data.isOwnProfile}
              profileUserId={profile.user_id}
              username={profile.username}
            />
            <Text color="fg.muted" fontSize="sm">
              {data.followState.follower_count} followers
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {data.followState.following_count} following
            </Text>
          </HStack>
        </VStack>
      </Grid>

      <SimpleGrid columns={[2, 4]} gap={4}>
        <StatTile
          label="Watching"
          value={data.stats.currently_watching_count}
        />
        <StatTile label="Completed" value={data.stats.completed_show_count} />
        <StatTile label="Movies" value={data.stats.watched_movie_count} />
        <StatTile label="Reviews" value={data.stats.public_review_count} />
      </SimpleGrid>

      <SimpleGrid columns={[1, 2]} gap={6}>
        <FollowList items={data.followState.followers} title="Followers" />
        <FollowList items={data.followState.following} title="Following" />
      </SimpleGrid>

      <VStack align="stretch" gap={4}>
        <Heading as="h2" fontSize="xl">
          Favorite genres
        </Heading>
        {data.favoriteGenres.length > 0 ? (
          <HStack flexWrap="wrap" gap={2}>
            {data.favoriteGenres.map((genre) => (
              <Badge key={genre} textTransform="none" variant="surface">
                {genre}
              </Badge>
            ))}
          </HStack>
        ) : (
          <EmptyState>
            Favorite genres will appear after this user shares public tracking
            activity.
          </EmptyState>
        )}
      </VStack>

      <MediaSection
        emptyText="No currently watching shows are public yet."
        items={data.currentlyWatching}
        title="Currently watching"
      />
      <MediaSection
        emptyText="No completed shows are public yet."
        items={data.completedShows}
        title="Completed shows"
      />
      <MediaSection
        emptyText="No watched movies are public yet."
        items={data.watchedMovies}
        title="Watched movies"
      />

      <VStack align="stretch" gap={4}>
        <Heading as="h2" fontSize="xl">
          Reviews
        </Heading>
        {data.reviews.length > 0 ? (
          <SimpleGrid columns={[1, 2]} gap={4}>
            {data.reviews.map((review) => (
              <ReviewCard
                key={`${review.mediaType}-${review.tmdbId}`}
                review={review}
              />
            ))}
          </SimpleGrid>
        ) : (
          <EmptyState>No public reviews yet.</EmptyState>
        )}
      </VStack>
    </Grid>
  );
};
