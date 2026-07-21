import {
  AspectRatio,
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  Text,
} from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import PosterImage from 'lib/components/shared/PosterImage';

type DetailData = {
  name: string;
  overview?: string;
  status: string;
  tagline?: string;
  releasedDate: Date | string;
  posterPath?: string | null;
};

type DetailMetaProps = {
  data: DetailData;
  extras?: React.ReactNode;
};

const DetailMeta = ({ data, extras }: DetailMetaProps) => {
  const releaseYear = data.releasedDate
    ? new Date(data.releasedDate).getFullYear()
    : undefined;
  const hasValidReleaseYear =
    typeof releaseYear === 'number' && Number.isFinite(releaseYear);

  return (
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
        <PosterImage alt={`${data.name} poster`} src={data.posterPath} />
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
          {data.name}
        </Heading>

        {data.tagline ? (
          <Text
            fontSize="0.7rem"
            fontWeight="light"
            letterSpacing={0}
            marginTop={4}
            marginX={[8, 8, 0]}
            textAlign={['center', 'center', 'inherit']}
            textTransform="uppercase"
            wordBreak="break-word"
          >
            {data.tagline}
          </Text>
        ) : null}

        <Flex alignItems="center" gap={2} wrap="wrap">
          <Badge variant="outline">{data.status}</Badge>

          <Text fontSize="xs" letterSpacing={0} textTransform="uppercase">
            {hasValidReleaseYear ? releaseYear : 'Release date unavailable'}
          </Text>
        </Flex>

        {extras ? (
          <Flex gridGap={2} wrap="wrap">
            {extras}
          </Flex>
        ) : null}

        {data.overview ? (
          <BionifiedParagraph textAlign="justify">
            {data.overview}
          </BionifiedParagraph>
        ) : (
          <Text color="gray.400">No overview is available from TMDB yet.</Text>
        )}
      </Grid>
    </Box>
  );
};

export default DetailMeta;
