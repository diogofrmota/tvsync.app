'use client';

import { Box, Button, Heading } from '@chakra-ui/react';
import {
  type MovieListPageNavButtonProps,
  MovieListPageNavButtons,
} from 'lib/components/movie/list/components';
import type { MovieListModeKey } from 'lib/components/movie/list/types';
import MoviesContainer from 'lib/components/movie/MoviesContainer';
import { useMovieList } from 'lib/services/tmdb/movie/list/index.client';
import type {
  ListType,
  MovieListItemType,
  MovieListParams,
} from 'lib/services/tmdb/movie/list/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type MovieListContainerProps = {
  listMode: MovieListModeKey;
  section?: ListType;
  genre?: string;
};

export const MovieListContainer = ({
  listMode,
  section,
  genre,
}: MovieListContainerProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const qPage = searchParams.get('page');
  const includeAdult = searchParams.get('include_adult') ?? undefined;
  const sortBy = searchParams.get('sort_by') ?? undefined;
  const voteAverageGte = searchParams.get('vote_average.gte') ?? undefined;
  const voteCountGte = searchParams.get('vote_count.gte') ?? undefined;
  const withGenres = searchParams.get('with_genres') ?? undefined;

  const page = qPage ? Number(qPage) : 1;

  const [totalPages, setTotalPages] = useState<number>(0);

  const [queries, setQueries] = useState<MovieListParams>();

  useEffect(() => {
    if (page || genre) {
      switch (listMode) {
        case 'discover':
          setQueries({
            include_adult: includeAdult,
            page,
            sort_by: sortBy,
            'vote_average.gte': voteAverageGte,
            'vote_count.gte': voteCountGte,
            with_genres: genre as string,
          });
          break;
        default:
          setQueries({
            include_adult: includeAdult,
            page,
            sort_by: sortBy,
            'vote_average.gte': voteAverageGte,
            'vote_count.gte': voteCountGte,
            with_genres: withGenres,
          });
          break;
      }
    }
  }, [
    page,
    genre,
    listMode,
    includeAdult,
    sortBy,
    voteAverageGte,
    voteCountGte,
    withGenres,
  ]);

  const filterMovies = (movies?: Array<MovieListItemType>) => {
    const minVoteAverage = voteAverageGte ? Number(voteAverageGte) : undefined;
    const minVoteCount = voteCountGte ? Number(voteCountGte) : undefined;

    return movies?.filter((movie) => {
      if (includeAdult === 'false' && movie.adult) {
        return false;
      }
      if (minVoteAverage && movie.vote_average < minVoteAverage) {
        return false;
      }
      if (minVoteCount && movie.vote_count < minVoteCount) {
        return false;
      }

      return true;
    });
  };

  const { data, isLoading } = useMovieList(
    listMode === 'section' ? section : undefined,
    queries
  );

  useEffect(() => {
    try {
      window.scroll({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    if (data?.total_pages) {
      setTotalPages(data.total_pages);
    }
  }, [data]);

  const pageNavButtonProps: MovieListPageNavButtonProps = {
    isLoading,
    page,
    totalPages,
    listMode,
    section,
    genre,
  };

  return (
    <Box mb={8} paddingX={8} w="full">
      <Button borderRadius={24} onClick={() => router.push('/')} width="full">
        Back
      </Button>

      <Box marginY={8}>
        {section && (
          <Heading
            as="h1"
            fontSize={{ base: '2xl', md: '4xl' }}
            fontWeight="500"
            textTransform="capitalize"
          >
            {section.replace('_', ' ')}
          </Heading>
        )}
        <MovieListPageNavButtons {...pageNavButtonProps} />
        <MoviesContainer
          isLoading={isLoading}
          movies={filterMovies(data?.results)}
        />
        <MovieListPageNavButtons {...pageNavButtonProps} />
      </Box>
    </Box>
  );
};
