'use client';

import { Badge, Box, Flex, Grid, Image, Text } from '@chakra-ui/react';
import DetailMeta from 'lib/components/shared/DetailMeta';
import { PageShell } from 'lib/components/shared/PageShell';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/PosterImage';
import { useColorMode } from 'lib/components/ui/color-mode';
import { RatingInput, ReviewsSection } from 'lib/features/reviews';
import { RecommendForm } from 'lib/features/social/recommend-form';
import { MediaStatusControl, TvProgressSummary } from 'lib/features/tracking';
import { WatchlistStateButton } from 'lib/features/watchlist';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import type { TVCreditsResponse } from 'lib/services/tmdb/tv/credits/types';
import type { TvShowDetail } from 'lib/services/tmdb/tv/detail/types';
import { MediaType } from 'lib/types';

import { TvShowAdditionalInfo } from './components/additional-info';
import { TvCastsWrapper } from './components/casts-wrapper';
import { SeasonsList } from './components/seasons-list';

export type TvShowDetailPageProps = {
  creditsData: TVCreditsResponse;
  data: TvShowDetail;
};

const TvShowDetailPage = ({ creditsData, data }: TvShowDetailPageProps) => {
  const { colorMode } = useColorMode();

  return (
    <PageShell>
      <Grid gridGap={[8, 16]}>
        <Box
          marginX={{ base: 0, md: -8 }}
          minHeight={{ base: '220px', md: '360px' }}
          overflow="hidden"
          position="relative"
        >
          <Image
            alt={
              data.backdrop_path ? `${data.name} backdrop` : 'TV show backdrop'
            }
            height="100%"
            inset={0}
            objectFit="cover"
            opacity={data.backdrop_path ? 0.55 : 0.2}
            position="absolute"
            src={
              data.backdrop_path
                ? `${IMAGE_URL_ORIGINAL}${data.backdrop_path}`
                : '/Movie Night-bro.svg'
            }
            width="100%"
          />
          <Box
            background="linear-gradient(180deg, transparent, var(--chakra-colors-bg))"
            bottom={0}
            height="55%"
            left={0}
            position="absolute"
            right={0}
          />
        </Box>

        <Grid flexBasis={['100%']} paddingX={{ base: 8, md: 0 }} rowGap={8}>
          <BackButton />

          <DetailMeta
            data={{
              name: data.name,
              posterPath: data.poster_path,
              status: data.status,
              releasedDate: data.first_air_date,
              tagline: data.tagline,
              overview: data.overview,
            }}
            extras={
              <Grid gap={4}>
                {data.genres.length > 0 ? (
                  <Flex gridGap={2} wrap="wrap">
                    {data.genres.map((genre) => (
                      <Badge
                        colorScheme="gray"
                        cursor="default"
                        key={`${genre.name}-${genre.id}`}
                        variant={colorMode === 'light' ? 'solid' : 'outline'}
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </Flex>
                ) : (
                  <Text color="gray.400">Genres unavailable</Text>
                )}
                <WatchlistStateButton
                  mediaType={MediaType.Tv}
                  size="md"
                  tmdbId={data.id}
                />
                <MediaStatusControl mediaType={MediaType.Tv} tmdbId={data.id} />
                <RatingInput
                  target={{ mediaType: MediaType.Tv, tmdbId: data.id }}
                />
                <RecommendForm mediaType={MediaType.Tv} tmdbId={data.id} />
                <TvProgressSummary tmdbShowId={data.id} />
              </Grid>
            }
          />
        </Grid>

        <Grid
          alignItems="center"
          flexBasis={['100%']}
          gap={8}
          paddingX={{ base: 8, md: 0 }}
          templateColumns={{ base: 'minmax(0, 1fr)', md: '1fr minmax(0, 2fr)' }}
        >
          <TvShowAdditionalInfo data={data} />

          <TvCastsWrapper credits={creditsData} />
        </Grid>

        <Grid paddingX={{ base: 8, md: 0 }}>
          <SeasonsList seasons={data.seasons} showId={data.id} />
        </Grid>

        <ReviewsSection mediaType={MediaType.Tv} tmdbId={data.id} />
      </Grid>
    </PageShell>
  );
};

export default TvShowDetailPage;
