import { AspectRatio, Box, Heading, Text } from '@chakra-ui/react';
import type { MovieVideo } from 'lib/services/tmdb/movie/videos/types';

export const MovieTrailer = ({ trailer }: { trailer: MovieVideo | null }) => (
  <Box as="section">
    <Heading fontSize={{ base: 'xl', md: '2xl' }} marginBottom={4}>
      Trailer
    </Heading>
    {trailer ? (
      <AspectRatio maxWidth="60rem" ratio={16 / 9}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={`https://www.youtube-nocookie.com/embed/${trailer.key}`}
          title={`${trailer.name || 'Movie trailer'} on YouTube`}
        />
      </AspectRatio>
    ) : (
      <Text color="fg.muted">No trusted trailer is available.</Text>
    )}
  </Box>
);
