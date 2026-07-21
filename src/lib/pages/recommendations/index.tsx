import {
  Box,
  Button,
  Grid,
  Heading,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/PosterImage';
import type { ReceivedRecommendationItem } from 'lib/features/social';
import { DismissRecommendationButton } from 'lib/features/social/dismiss-recommendation-button';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';

type RecommendationsPageProps = {
  items: Array<ReceivedRecommendationItem>;
};

const getMediaHref = (mediaType: MediaType.Movie | MediaType.Tv, id: number) =>
  (mediaType === MediaType.Movie ? `/movie/${id}` : `/tv/show/${id}`) as Route;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value)
  );

export const RecommendationsPage = ({ items }: RecommendationsPageProps) => (
  <Grid gap={8} marginX="auto" maxWidth="64rem" paddingX={8}>
    <Stack gap={2}>
      <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
        Recommendations
      </Heading>
      <Text color="white">Movies and TV shows sent by people you follow.</Text>
    </Stack>

    {items.length === 0 ? (
      <Box
        borderColor="border"
        borderRadius="md"
        borderStyle="dashed"
        borderWidth="1px"
        padding={6}
      >
        <Text color="fg.muted">
          No recommendations yet. Follow public profiles and they can send you
          titles to try next.
        </Text>
      </Box>
    ) : (
      <Grid gap={4}>
        {items.map((item) => (
          <Grid
            alignItems="center"
            borderColor="border"
            borderRadius="md"
            borderWidth="1px"
            gap={4}
            key={item.id}
            padding={4}
            templateColumns={{
              base: '72px minmax(0, 1fr)',
              md: '92px minmax(0, 1fr) auto',
            }}
          >
            <Image
              alt={`${item.title} poster`}
              aspectRatio={2 / 3}
              background="gray.800"
              borderRadius={6}
              objectFit="cover"
              src={
                item.posterPath
                  ? `${IMAGE_URL}${item.posterPath}`
                  : '/Movie Night-bro.svg'
              }
              width="100%"
            />
            <Stack gap={2} minWidth={0}>
              <Heading asChild fontSize="md">
                <Link href={getMediaHref(item.mediaType, item.tmdbId)}>
                  {item.title}
                </Link>
              </Heading>
              <Text color="fg.muted" fontSize="sm">
                Recommended by{' '}
                <Link href={`/profile/${item.username}` as Route}>
                  {item.displayName}
                </Link>{' '}
                on {formatDate(item.createdAt)}
              </Text>
              {item.note ? (
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {item.note}
                </Text>
              ) : null}
            </Stack>
            <Stack align="flex-start" direction={{ base: 'row', md: 'column' }}>
              <Button asChild size="sm">
                <Link href={getMediaHref(item.mediaType, item.tmdbId)}>
                  Open
                </Link>
              </Button>
              <DismissRecommendationButton id={item.id} />
            </Stack>
          </Grid>
        ))}
      </Grid>
    )}
  </Grid>
);
