import { AspectRatio, Badge, Box, Grid, Heading, Text } from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterImage from 'lib/components/shared/PosterImage';
import { RatingInput } from 'lib/features/reviews';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import { SeasonEpisodeList } from 'lib/pages/tv/season/detail/components/season-episode-list';
import type { TVSeasonDetailsResponse } from 'lib/services/tmdb/tv/season/types';
import type { Route } from 'next';
import Link from 'next/link';

type TVSeasonDetailPageProps = {
  data: TVSeasonDetailsResponse;
  initialWatchedEpisodeNumbers: Array<number>;
  showId: number;
  showName: string;
};

const formatRating = (rating: number) =>
  rating > 0 ? `${rating.toFixed(1)} / 10` : 'Not rated yet';

const getReleaseYear = (airDate: string) => {
  const year = airDate ? new Date(airDate).getUTCFullYear() : Number.NaN;

  return Number.isFinite(year) ? String(year) : 'Release year unavailable';
};

const isSeasonUnreleased = (airDate: string) =>
  Boolean(airDate) && new Date(airDate) > new Date();

export const TVSeasonDetailPage = ({
  data,
  initialWatchedEpisodeNumbers,
  showId,
  showName,
}: TVSeasonDetailPageProps) => {
  const seasonTitle = data.name || `Season ${data.season_number}`;
  const unreleased = isSeasonUnreleased(data.air_date);

  return (
    <PageShell>
      <Grid gridGap={[8, 16]}>
        <Grid flexBasis={['100%']} paddingX={{ base: 8, md: 0 }} rowGap={8}>
          <BackButton />

          <Box
            alignItems="center"
            display={{ base: 'grid', md: 'flex' }}
            gap={{ base: 8, md: 16 }}
          >
            <AspectRatio
              marginX={[8, '25%', 0]}
              maxHeight={['100%']}
              maxWidth={['100%']}
              minWidth={{ base: undefined, md: 300 }}
              ratio={3.6 / 5}
            >
              <PosterImage
                alt={`${seasonTitle} poster`}
                src={data.poster_path}
              />
            </AspectRatio>

            <Grid gap={4}>
              <Link href={`/tv/show/${showId}` as Route} prefetch={false}>
                <Text
                  color="fg.muted"
                  fontSize="sm"
                  letterSpacing={0}
                  textTransform="uppercase"
                >
                  {showName}
                </Text>
              </Link>

              <Heading
                fontWeight="bold"
                letterSpacing={0}
                marginX={[8, 8, 0]}
                size="lg"
                textAlign={['center', 'center', 'inherit']}
                textTransform="uppercase"
                wordBreak="break-word"
              >
                {seasonTitle}
              </Heading>

              <Grid
                alignItems="center"
                gap={2}
                templateColumns={{ base: '1fr', md: 'repeat(3, max-content)' }}
              >
                <Badge variant="outline">Season {data.season_number}</Badge>
                <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
                  {getReleaseYear(data.air_date)}
                </Text>
                <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
                  {data.episodes.length} episodes
                </Text>
              </Grid>

              <Text fontSize="sm" letterSpacing={0} textTransform="uppercase">
                TMDB rating: <b>{formatRating(data.vote_average)}</b>
              </Text>

              <RatingInput
                label="Your season rating"
                target={{
                  mediaType: 'tv_season',
                  seasonNumber: data.season_number,
                  tmdbId: showId,
                }}
              />

              {data.overview ? (
                <BionifiedParagraph textAlign="justify">
                  {data.overview}
                </BionifiedParagraph>
              ) : (
                <Text color="fg.muted">
                  No overview is available from TMDB for this season yet.
                </Text>
              )}
            </Grid>
          </Box>
        </Grid>

        <Grid gap={4} paddingX={{ base: 8, md: 0 }}>
          <Heading fontSize="lg" fontWeight="400" textTransform="uppercase">
            Episodes
          </Heading>

          {unreleased ? (
            <Text color="fg.muted" fontSize="sm">
              This season has not premiered yet. Episodes will appear here as
              TMDB adds them.
            </Text>
          ) : null}

          {data.episodes.length > 0 ? (
            <SeasonEpisodeList
              episodes={data.episodes}
              initialWatchedEpisodeNumbers={initialWatchedEpisodeNumbers}
              seasonNumber={data.season_number}
              showId={showId}
            />
          ) : (
            <Text color="fg.muted">
              TMDB does not have episode information for this season yet.
            </Text>
          )}
        </Grid>
      </Grid>
    </PageShell>
  );
};
