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
import type { TvShowDetail } from 'lib/services/tmdb/tv/detail/types';
import { BiLinkExternal } from 'react-icons/bi';

type TvShowAdditionalInfoProps = {
  data: TvShowDetail;
  isLoading?: boolean;
};

const formatRuntime = (runtimes: Array<number>) => {
  const runtime = runtimes.find((item) => item > 0);

  return runtime ? `${runtime} min` : 'Unavailable';
};

const formatRating = (rating: number) =>
  rating > 0 ? `${rating.toFixed(1)} / 10` : 'Not rated yet';

export const TvShowAdditionalInfo = ({
  data,
  isLoading,
}: TvShowAdditionalInfoProps) => (
  <Grid gap={8}>
    <Skeleton loading={!!isLoading}>
      {data.homepage ? (
        <Flex gridColumnGap={2}>
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
        </Flex>
      ) : null}
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
          First air date:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {data.first_air_date || 'Unavailable'}
          </Text>
        </Text>
        <Text>
          Status:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {data.status || 'Unavailable'}
          </Text>
        </Text>
        <Text>
          Seasons:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {data.number_of_seasons || 'Unavailable'}
          </Text>
        </Text>
        <Text>
          Episodes:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {data.number_of_episodes || 'Unavailable'}
          </Text>
        </Text>
        <Text>
          Episode runtime:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {formatRuntime(data.episode_run_time)}
          </Text>
        </Text>
        <Text>
          Type:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {data.type || 'Unavailable'}
          </Text>
        </Text>
        <Text>
          Networks:{' '}
          <Text as="span" fontWeight="bold" letterSpacing={0}>
            {data.networks.length > 0
              ? data.networks.map((network) => network.name).join(', ')
              : 'Unavailable'}
          </Text>
        </Text>
        <Text>
          TMDB rating: <b>{formatRating(data.vote_average)}</b>{' '}
          <Text as="span" fontSize="xs">
            ({data.vote_count} votes)
          </Text>
        </Text>
      </Grid>
    </Skeleton>
  </Grid>
);
