import { Box, Flex, Grid, Heading, Image, Text } from '@chakra-ui/react';
import DetailMeta from 'lib/components/shared/DetailMeta';
import { PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/PosterImage';
import SliderContainer from 'lib/components/shared/SliderContainer';
import { FavoriteButton } from 'lib/features/profile/favorite-button';
import { RatingInput, ReviewsSection } from 'lib/features/reviews';
import { RecommendForm } from 'lib/features/social/recommend-form';
import { MediaStatusControl } from 'lib/features/tracking';
import { WatchlistStateButton } from 'lib/features/watchlist';
import MovieDetailAdditionalInfo from 'lib/pages/movie/detail/components/additional-info';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import CastsWrapper from 'lib/pages/movie/detail/components/casts-wrapper';
import { GenreList } from 'lib/pages/movie/detail/components/genre-list';
import type { MovieCreditsResponse } from 'lib/services/tmdb/movie/credits/types';
import type { MovieDetailResponse } from 'lib/services/tmdb/movie/detail/types';
import type { MovieListResponse } from 'lib/services/tmdb/movie/list/types';
import { MediaType } from 'lib/types';

export type MovieDetailPageProps = {
  detailData: MovieDetailResponse;
  creditsData: MovieCreditsResponse;
  recommendationsData: MovieListResponse;
};

export const MovieDetailPage = ({
  detailData: data,
  creditsData: credits,
  recommendationsData,
}: MovieDetailPageProps) => {
  const directorNames = credits.crew
    .filter((crewMember) => crewMember.job === 'Director')
    .map((director) => director.name);
  const recommendations = recommendationsData.results.slice(0, 12);

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
            alt={`${data.title} backdrop`}
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
              name: data.title,
              tagline: data.tagline,
              status: data.status,
              releasedDate: data.release_date,
              posterPath: data.poster_path,
              overview: data.overview,
            }}
            extras={
              <Grid gap={4}>
                {data.genres.length > 0 ? (
                  <GenreList data={data} />
                ) : (
                  <Text color="gray.400">Genres unavailable</Text>
                )}
                <WatchlistStateButton
                  mediaType={MediaType.Movie}
                  size="md"
                  tmdbId={data.id}
                />
                <MediaStatusControl
                  mediaType={MediaType.Movie}
                  tmdbId={data.id}
                />
                <FavoriteButton mediaType={MediaType.Movie} tmdbId={data.id} />
                <RatingInput
                  target={{ mediaType: MediaType.Movie, tmdbId: data.id }}
                />
                <RecommendForm mediaType={MediaType.Movie} tmdbId={data.id} />
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
          <MovieDetailAdditionalInfo
            data={data}
            directorNames={directorNames}
            movieId={data.id}
          />

          <CastsWrapper credits={credits} />
        </Grid>

        <ReviewsSection mediaType={MediaType.Movie} tmdbId={data.id} />

        <Grid gap={4} paddingX={{ base: 0, md: 0 }}>
          {recommendations.length > 0 ? (
            <SliderContainer sectionTitle="Recommended movies">
              {recommendations.map((movie, idx) => (
                <PosterCard
                  id={movie.id}
                  imageUrl={movie.poster_path}
                  isLastItem={idx === recommendations.length - 1}
                  key={`${movie.title}-${movie.id}`}
                  layout="flex"
                  mediaType={MediaType.Movie}
                  name={movie.title}
                  prefetch={false}
                />
              ))}
            </SliderContainer>
          ) : (
            <Flex direction="column" gap={2} paddingX={{ base: 8, md: 0 }}>
              <Heading fontSize="lg" fontWeight="400" textTransform="uppercase">
                Recommended movies
              </Heading>
              <Text color="gray.400">
                TMDB does not have recommendations for this movie yet.
              </Text>
            </Flex>
          )}
        </Grid>
      </Grid>
    </PageShell>
  );
};
