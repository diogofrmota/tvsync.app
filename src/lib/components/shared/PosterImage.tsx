import type { ImageProps } from '@chakra-ui/react';
import { Box, Image, Text } from '@chakra-ui/react';

export const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
export const IMAGE_URL_ORIGINAL = 'https://image.tmdb.org/t/p/original';

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
  const flexSize: ImageProps = {
    height: { base: '10.5rem', sm: '11.5rem', md: '12.5rem' },
    width: { base: '7.5rem', sm: '8.25rem', md: '9rem' },
  };

  if (!src) {
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
        <Text
          _dark={{ color: 'gray.100' }}
          color="gray.600"
          fontSize="sm"
          fontWeight="medium"
        >
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
      src={`${IMAGE_URL}${src}`}
      {...(layout === 'flex' && flexSize)}
      {...props}
      alt={alt}
    />
  );
};

export default PosterImage;
