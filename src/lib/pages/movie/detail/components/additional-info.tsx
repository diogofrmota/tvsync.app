'use client';

import {
  Button,
  Link as ChakraLink,
  Flex,
  Grid,
  Heading,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { convertToPrice } from 'lib/utils/convert-to-price';
import Link from 'next/link';
import { BiLinkExternal } from 'react-icons/bi';
import { FaImdb } from 'react-icons/fa';
import { GrGallery } from 'react-icons/gr';

import type { MovieDetailSectionProps } from '../types';

type MovieDetailAdditionalInfoProps = MovieDetailSectionProps & {
  directorNames: Array<string>;
  movieId: number;
};

const MovieDetailAdditionalInfo = ({
  isLoading,
  data,
  directorNames,
  movieId,
}: MovieDetailAdditionalInfoProps) => {
  const runtimeLabel = data.runtime ? `${data.runtime} min` : 'Unavailable';
  const releaseDateLabel = data.release_date || 'Unavailable';
  const ratingLabel = data.vote_average
    ? `${data.vote_average.toFixed(1)} / 10`
    : 'Not rated yet';

  return (
    <Grid gap={8}>
      <Skeleton loading={!!isLoading}>
        {data && (
          <Flex gridColumnGap={2}>
            {data.homepage && (
              <ChakraLink
                _hover={undefined}
                href={data.homepage}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button size="sm">
                  <BiLinkExternal />
                  website
                </Button>
              </ChakraLink>
            )}
            {data.imdb_id && (
              <ChakraLink
                href={`https://www.imdb.com/title/${data.imdb_id}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button size="sm">
                  <FaImdb />
                  IMDB
                </Button>
              </ChakraLink>
            )}

            <Button asChild size="sm">
              <Link href={`/movie/${movieId}/images`} prefetch={false}>
                <GrGallery />
                gallery
              </Link>
            </Button>
          </Flex>
        )}
      </Skeleton>

      <Skeleton display="grid" gap={4} loading={!!isLoading}>
        <Heading fontSize="lg">Details</Heading>

        <Grid
          fontSize="sm"
          gridGap={1}
          letterSpacing={0}
          textTransform="uppercase"
        >
          <Text>
            Release date:{' '}
            <Text as="span" fontWeight="bold" letterSpacing={0}>
              {releaseDateLabel}
            </Text>
          </Text>
          <Text>
            Runtime:{' '}
            <Text as="span" fontWeight="bold" letterSpacing={0}>
              {runtimeLabel}
            </Text>
          </Text>
          <Text>
            Director:{' '}
            <Text as="span" fontWeight="bold" letterSpacing={0}>
              {directorNames.length > 0 ? directorNames.join(', ') : 'Unknown'}
            </Text>
          </Text>
          <Text>
            Revenue:{' '}
            <Text as="span" fontWeight="bold" letterSpacing={0}>
              {data.revenue ? convertToPrice(data.revenue) : 'Unavailable'}
            </Text>
          </Text>
          <Text>
            TMDB rating: <b>{ratingLabel}</b>{' '}
            <Text as="span" fontSize="xs">
              {' '}
              ({data.vote_count} votes)
            </Text>
          </Text>
        </Grid>
      </Skeleton>
    </Grid>
  );
};

export default MovieDetailAdditionalInfo;
