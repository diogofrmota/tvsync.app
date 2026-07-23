'use client';

import { Box, Button, Flex, Image, Input, Stack, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import { useMovieList } from 'lib/services/tmdb/movie/list/index.client';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import { useTVShowSearchResultList } from 'lib/services/tmdb/tv/list/index.client';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';

type MediaSearchBarProps = {
  mediaType: MediaType.Movie | MediaType.Tv;
  placeholder: string;
};

type SearchSuggestion = {
  href: Route;
  id: number;
  posterPath: string | null;
  subtitle: string;
  title: string;
};

const suggestionLimit = 5;

const getYear = (date: string | null | undefined) =>
  date ? date.slice(0, 4) : 'Year unknown';

const mapMovieSuggestion = (movie: MovieListItemType): SearchSuggestion => ({
  href: `/movie/${movie.id}` as Route,
  id: movie.id,
  posterPath: movie.poster_path,
  subtitle: getYear(movie.release_date),
  title: movie.title,
});

const mapTvSuggestion = (show: TVShowItem): SearchSuggestion => ({
  href: `/tv/show/${show.id}` as Route,
  id: show.id,
  posterPath: show.poster_path,
  subtitle: getYear(show.first_air_date),
  title: show.name,
});

export const MediaSearchBar = ({
  mediaType,
  placeholder,
}: MediaSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const trimmedQuery = query.trim();
  const isReady = debouncedQuery.length > 1;
  const isMovieSearch = mediaType === MediaType.Movie;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [trimmedQuery]);

  const movieResults = useMovieList(
    'popular',
    { page: 1, query: debouncedQuery },
    undefined,
    isMovieSearch && isReady
  );
  const tvResults = useTVShowSearchResultList(
    { page: 1, query: debouncedQuery },
    !isMovieSearch && isReady
  );

  const suggestions = useMemo(() => {
    if (!isReady) {
      return [];
    }

    return (
      isMovieSearch
        ? (movieResults.data?.results ?? []).map(mapMovieSuggestion)
        : (tvResults.data?.results ?? []).map(mapTvSuggestion)
    ).slice(0, suggestionLimit);
  }, [
    isMovieSearch,
    isReady,
    movieResults.data?.results,
    tvResults.data?.results,
  ]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!trimmedQuery) {
      event.preventDefault();
    }
  };

  return (
    <Box asChild width="full">
      <form action="/search" onSubmit={handleSubmit}>
        <Box
          maxWidth={{ base: 'full', md: '36rem' }}
          position="relative"
          width="full"
        >
          <Flex gap={3} width="full">
            <Input
              _focusVisible={{
                borderColor: 'white',
                boxShadow: '0 0 0 1px white',
              }}
              _hover={{ borderColor: 'white' }}
              _placeholder={{ color: 'whiteAlpha.700' }}
              aria-label={placeholder}
              autoComplete="off"
              borderColor="white"
              borderRadius={24}
              name="query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              type="search"
              value={query}
            />
            <input name="page" type="hidden" value="1" />
            <input name="type" type="hidden" value={mediaType} />
            <Button aria-label="Search" borderRadius={24} type="submit">
              <FiSearch />
            </Button>
          </Flex>

          {suggestions.length > 0 ? (
            <Box
              background="gray.950"
              borderColor="whiteAlpha.300"
              borderRadius={8}
              borderWidth={1}
              boxShadow="lg"
              left={0}
              marginTop={2}
              overflow="hidden"
              position="absolute"
              right={{ base: 14, md: 16 }}
              zIndex={20}
            >
              <Stack gap={0}>
                {suggestions.map((suggestion) => (
                  <Box
                    _hover={{ background: 'whiteAlpha.100' }}
                    asChild
                    key={suggestion.id}
                  >
                    <Link href={suggestion.href} prefetch={false}>
                      <Flex align="center" gap={3} padding={3}>
                        <Image
                          alt={`${suggestion.title} poster`}
                          aspectRatio={2 / 3}
                          background="gray.800"
                          borderRadius={4}
                          height="56px"
                          objectFit="cover"
                          src={
                            suggestion.posterPath
                              ? `${IMAGE_URL}${suggestion.posterPath}`
                              : '/Movie Night-bro.svg'
                          }
                          width="38px"
                        />
                        <Stack gap={0} minWidth={0}>
                          <Text
                            color="white"
                            fontSize="sm"
                            fontWeight="600"
                            truncate
                          >
                            {suggestion.title}
                          </Text>
                          <Text color="whiteAlpha.700" fontSize="xs">
                            {suggestion.subtitle}
                          </Text>
                        </Stack>
                      </Flex>
                    </Link>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Box>
      </form>
    </Box>
  );
};
