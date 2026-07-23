'use client';

import type { ImageProps } from '@chakra-ui/react';
import { Box, Image, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import { useState } from 'react';

type PosterImageProps = Omit<ImageProps, 'src'> & {
  alt?: string;
  layout?: 'grid' | 'flex';
  src?: string | null;
};

const PosterImage = ({
  alt = 'Poster unavailable',
  src,
  layout,
  ...props
}: PosterImageProps) => {
  const [failedToLoad, setFailedToLoad] = useState(false);
  const flexSize: ImageProps = {
    height: { base: '10.5rem', sm: '11.5rem', md: '12.5rem' },
    width: { base: '7.5rem', sm: '8.25rem', md: '9rem' },
  };

  if (!src || failedToLoad) {
    return (
      <Box
        alignItems="center"
        aria-label={alt}
        background="bg.muted"
        borderColor="border"
        borderRadius="md"
        borderWidth="1px"
        display="flex"
        justifyContent="center"
        minHeight="100%"
        padding={4}
        role="img"
        textAlign="center"
        {...(layout === 'flex' && flexSize)}
        {...props}
      >
        <Text color="fg.muted" fontSize="sm" fontWeight="medium">
          Poster unavailable
        </Text>
      </Box>
    );
  }

  return (
    <Image
      _groupHover={{ opacity: 0.5 }}
      borderRadius="md"
      objectFit="cover"
      onError={() => setFailedToLoad(true)}
      src={`${IMAGE_URL}${src}`}
      {...(layout === 'flex' && flexSize)}
      {...props}
      alt={alt}
    />
  );
};

export default PosterImage;
