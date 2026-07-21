'use client';

import {
  AspectRatio,
  Badge,
  Grid,
  Heading,
  Image,
  Text,
} from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/PosterImage';
import { RatingInput } from 'lib/features/reviews';
import { EpisodeProgressButton } from 'lib/features/tracking';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import type { TVEpisodeDetailsResponse } from 'lib/services/tmdb/tv/episode/types';

type TVEpisodeDetailPageProps = {
  data: TVEpisodeDetailsResponse;
};

const formatEpisodeTitle = (data: TVEpisodeDetailsResponse) =>
  data.name || `Episode ${data.episode_number}`;

export const TVEpisodeDetailPage = ({ data }: TVEpisodeDetailPageProps) => {
  const title = formatEpisodeTitle(data);

  return (
    <Grid gridGap={[8, 16]} paddingX={{ base: 8, md: 8 }}>
      <BackButton />

      <Grid gap={8}>
        <AspectRatio ratio={16 / 9} width="100%">
          <Image
            alt={
              data.still_path ? `${title} still` : 'Episode still unavailable'
            }
            borderRadius={8}
            objectFit="cover"
            src={
              data.still_path
                ? `${IMAGE_URL_ORIGINAL}${data.still_path}`
                : '/Movie Night-bro.svg'
            }
          />
        </AspectRatio>

        <Grid gap={4}>
          <Heading
            fontWeight="bold"
            letterSpacing={0}
            size="lg"
            textTransform="uppercase"
            wordBreak="break-word"
          >
            {title}
          </Heading>

          <Grid
            alignItems="center"
            gap={2}
            templateColumns={{ base: '1fr', md: 'repeat(3, max-content)' }}
          >
            <Badge variant="outline">Season {data.season_number}</Badge>
            <Badge variant="outline">Episode {data.episode_number}</Badge>
            <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
              {data.air_date || 'Air date unavailable'}
            </Text>
          </Grid>

          <EpisodeProgressButton
            episodeNumber={data.episode_number}
            seasonNumber={data.season_number}
            size="md"
            tmdbShowId={data.show_id}
          />

          <RatingInput
            label="Your episode rating"
            target={{
              episodeNumber: data.episode_number,
              mediaType: 'tv_episode',
              seasonNumber: data.season_number,
              tmdbId: data.show_id,
            }}
          />

          {data.overview ? (
            <BionifiedParagraph textAlign="justify">
              {data.overview}
            </BionifiedParagraph>
          ) : (
            <Text color="gray.400">
              No overview is available from TMDB for this episode yet.
            </Text>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
};
