import { Box, Grid, Heading, Stack, Text } from '@chakra-ui/react';
import { MediaRatingPanel } from 'lib/components/shared/MediaRating';
import { pagePaddingX } from 'lib/components/shared/PageShell';
import PosterImage from 'lib/components/shared/PosterImage';
import { IMAGE_URL_ORIGINAL } from 'lib/components/shared/tmdb-image-urls';
import type { ImdbRating } from 'lib/services/omdb/types';
import type { ReactNode } from 'react';

type MediaDetailHeroProps = {
  /** The personal controls, rendered under the poster row. */
  actions: ReactNode;
  backdropPath: null | string;
  imdbRating: ImdbRating | null;
  posterPath: null | string;
  title: string;
  voteAverage: number;
  voteCount: number;
  /** The release year, already formatted, or a stated fallback. */
  year: string;
};

// The artwork behind the poster row. It is deliberately shallow: the poster and
// the title sit below it, not on top of it, so the backdrop never competes with
// the text for contrast.
const backdropHeight = {
  base: '13rem',
  sm: '17rem',
  md: '23rem',
  lg: '28rem',
} as const;

// The poster rides up into the backdrop by roughly a third of its own height,
// which is what makes the two images read as one header instead of two blocks.
const posterOffset = {
  base: '8rem',
  sm: '11rem',
  md: '14rem',
  lg: '17rem',
} as const;

/**
 * The header both detail pages share: the title's own backdrop fading into the
 * page background, the official poster overlapping it on the left, and the
 * title, year, and score in the wider column beside it. The personal controls —
 * add to library, mark as finished, favourite — close the header directly under
 * the poster row.
 *
 * When TMDB has no backdrop the poster stands in for it, and when it has
 * neither the header degrades to a plain surface rather than a broken image.
 */
export const MediaDetailHero = ({
  actions,
  backdropPath,
  imdbRating,
  posterPath,
  title,
  voteAverage,
  voteCount,
  year,
}: MediaDetailHeroProps) => {
  const backdrop = backdropPath ?? posterPath;

  return (
    <Box as="header" position="relative" width="full">
      <Box
        aria-hidden
        height={backdropHeight}
        left={0}
        overflow="hidden"
        position="absolute"
        right={0}
        top={0}
      >
        {backdrop ? (
          <Box
            backgroundImage={`url(${IMAGE_URL_ORIGINAL}${backdrop})`}
            backgroundPosition="center 25%"
            backgroundRepeat="no-repeat"
            backgroundSize="cover"
            height="full"
            width="full"
          />
        ) : (
          <Box background="bg.surface" height="full" width="full" />
        )}

        {/* The fade lands on the page background exactly at the bottom edge, so
            there is no seam between the artwork and the rest of the page. */}
        <Box
          backgroundImage="linear-gradient(to bottom, rgba(5, 6, 6, 0.2) 0%, rgba(5, 6, 6, 0.7) 55%, #050606 100%)"
          inset={0}
          position="absolute"
        />
      </Box>

      <Stack
        gap={{ base: 5, md: 6 }}
        marginX="auto"
        maxWidth="80rem"
        paddingBottom={{ base: 2, md: 4 }}
        paddingTop={posterOffset}
        paddingX={pagePaddingX}
        position="relative"
        width="full"
      >
        <Grid
          alignItems="center"
          gap={{ base: 4, md: 8 }}
          templateColumns={{
            base: '7.5rem minmax(0, 1fr)',
            md: '13rem minmax(0, 1fr)',
          }}
        >
          {/* The poster keeps its 2:3 frame through plain CSS rather than
              Chakra's AspectRatio: that component calls React.Children.only,
              which a Server Component's serialized child fails under `next
              dev`, sending the header to the error page while it is being
              worked on. The production build is unaffected either way. */}
          <Box aspectRatio="2 / 3" position="relative" width="full">
            <PosterImage
              alt={`${title} poster`}
              borderColor="whiteAlpha.300"
              borderWidth="1px"
              boxShadow="0 1.25rem 2.5rem rgba(0, 0, 0, 0.55)"
              height="full"
              inset={0}
              objectFit="cover"
              position="absolute"
              src={posterPath}
              width="full"
            />
          </Box>

          <Stack gap={{ base: 1, md: 2 }}>
            <Heading
              as="h1"
              fontSize={{ base: '2xl', md: '4xl' }}
              lineHeight="1.1"
            >
              {title}
            </Heading>

            <Text
              color="fg.muted"
              fontSize={{ base: 'sm', md: 'md' }}
              opacity={0.7}
            >
              {year}
            </Text>

            {/* The score sits directly under the title, on its own line, so it
                reads as part of the heading rather than as one more fact. */}
            <MediaRatingPanel
              imdbRating={imdbRating}
              voteAverage={voteAverage}
              voteCount={voteCount}
            />
          </Stack>
        </Grid>

        {actions}
      </Stack>
    </Box>
  );
};
