'use client';

import {
  AspectRatio,
  Badge,
  Box,
  Grid,
  Heading,
  Image,
  Text,
} from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterImage, {
  IMAGE_URL_ORIGINAL,
} from 'lib/components/shared/PosterImage';
import { RatingInput } from 'lib/features/reviews';
import {
  EpisodeProgressButton,
  SeasonProgressControls,
} from 'lib/features/tracking';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import type { TVSeasonDetailsResponse } from 'lib/services/tmdb/tv/season/types';
import type { Route } from 'next';
import Link from 'next/link';

type TVSeasonDetailPageProps = {
  data: TVSeasonDetailsResponse;
  showId: number;
};

const formatRating = (rating: number) =>
  rating > 0 ? `${rating.toFixed(1)} / 10` : 'Not rated yet';

const formatRuntime = (runtime: number) =>
  runtime > 0 ? `${runtime} min` : 'Runtime unavailable';

const getEpisodeHref = (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
) =>
  `/tv/show/${showId}/season/${seasonNumber}/episode/${episodeNumber}` as Route;

export const TVSeasonDetailPage = ({
  data,
  showId,
}: TVSeasonDetailPageProps) => (
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
            <PosterImage alt={`${data.name} poster`} src={data.poster_path} />
          </AspectRatio>

          <Grid gap={4}>
            <Heading
              fontWeight="bold"
              letterSpacing={0}
              marginX={[8, 8, 0]}
              size="lg"
              textAlign={['center', 'center', 'inherit']}
              textTransform="uppercase"
              wordBreak="break-word"
            >
              {data.name || `Season ${data.season_number}`}
            </Heading>

            <Grid
              alignItems="center"
              gap={2}
              templateColumns={{ base: '1fr', md: 'repeat(3, max-content)' }}
            >
              <Badge variant="outline">Season {data.season_number}</Badge>
              <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
                {data.air_date || 'Air date unavailable'}
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
              <Text color="gray.400">
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

        <SeasonProgressControls
          episodeCount={data.episodes.length}
          seasonNumber={data.season_number}
          tmdbShowId={showId}
        />

        {data.episodes.length > 0 ? (
          <Grid gap={4}>
            {data.episodes.map((episode) => (
              <Grid
                _hover={{ borderColor: 'gray.400' }}
                borderColor="whiteAlpha.300"
                borderRadius={8}
                borderWidth="1px"
                key={episode.id}
                overflow="hidden"
                padding={3}
              >
                <Grid
                  gap={4}
                  templateColumns={{
                    base: '1fr',
                    md: '180px minmax(0, 1fr) auto',
                  }}
                >
                  <Link
                    href={getEpisodeHref(
                      showId,
                      data.season_number,
                      episode.episode_number
                    )}
                    prefetch={false}
                  >
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        alt={
                          episode.still_path
                            ? `${episode.name} still`
                            : 'Episode still unavailable'
                        }
                        borderRadius={8}
                        objectFit="cover"
                        src={
                          episode.still_path
                            ? `${IMAGE_URL_ORIGINAL}${episode.still_path}`
                            : '/Movie Night-bro.svg'
                        }
                      />
                    </AspectRatio>
                  </Link>

                  <Link
                    href={getEpisodeHref(
                      showId,
                      data.season_number,
                      episode.episode_number
                    )}
                    prefetch={false}
                  >
                    <Grid alignContent="start" gap={2}>
                      <Heading fontSize="md">
                        {episode.episode_number}.{' '}
                        {episode.name || 'Untitled episode'}
                      </Heading>
                      <Text color="gray.400" fontSize="sm">
                        {episode.air_date || 'Air date unavailable'} |{' '}
                        {formatRuntime(episode.runtime)}
                      </Text>
                      {episode.overview ? (
                        <Text fontSize="sm" lineClamp={3}>
                          {episode.overview}
                        </Text>
                      ) : (
                        <Text color="gray.400" fontSize="sm">
                          No overview is available for this episode.
                        </Text>
                      )}
                    </Grid>
                  </Link>

                  <EpisodeProgressButton
                    episodeNumber={episode.episode_number}
                    seasonNumber={data.season_number}
                    tmdbShowId={showId}
                  />
                </Grid>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Text color="gray.400">
            TMDB does not have episode information for this season yet.
          </Text>
        )}
      </Grid>
    </Grid>
  </PageShell>
);
