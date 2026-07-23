'use client';

import { Grid, Heading } from '@chakra-ui/react';
import ImageSection from 'lib/components/movie/image/ImageSection';
import { BackButton } from 'lib/pages/movie/detail/components/back-button';
import { useMovieImages } from 'lib/services/tmdb/movie/images/index.client';

export const MovieImagesPage = ({ movieId }: { movieId: number }) => {
  const { data } = useMovieImages(movieId);

  return (
    <Grid gridGap={[8, 16]} templateColumns="minmax(0,1fr)">
      <BackButton />

      <Heading marginX={8}>Images</Heading>

      {data?.backdrops && (
        <ImageSection data={data.backdrops} maxHeight={300} title="Backdrops" />
      )}

      {data?.posters && (
        <ImageSection data={data.posters} maxHeight={200} title="Posters" />
      )}
    </Grid>
  );
};
