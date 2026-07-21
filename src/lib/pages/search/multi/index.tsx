'use client';

import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { PageNavButtonProps } from 'lib/components/shared/list/page-nav-buttons';
import PageNavButtons from 'lib/components/shared/list/page-nav-buttons';
import { IMAGE_URL } from 'lib/components/shared/PosterImage';
import { WatchlistStateButton } from 'lib/features/watchlist';
import { useMovieList } from 'lib/services/tmdb/movie/list/index.client';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import { useMultiSearchResult } from 'lib/services/tmdb/search/multi/index.client';
import type { MultiSearchResult } from 'lib/services/tmdb/search/multi/types';
import { useTVShowSearchResultList } from 'lib/services/tmdb/tv/list/index.client';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MediaFilter = 'all' | MediaType.Movie | MediaType.Tv;
type SearchableMediaResult = MultiSearchResult & {
  media_type: MediaType.Movie | MediaType.Tv;
};

const filterOptions: Array<{ label: string; value: MediaFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: MediaType.Movie },
  { label: 'TV Shows', value: MediaType.Tv },
];

const movieGenreMap: Record<number, string> = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  99: 'Documentary',
  878: 'Science Fiction',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10770: 'TV Movie',
};

const tvGenreMap: Record<number, string> = {
  16: 'Animation',
  18: 'Drama',
  35: 'Comedy',
  37: 'Western',
  80: 'Crime',
  99: 'Documentary',
  9648: 'Mystery',
  10751: 'Family',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

const getMediaFilter = (value: string | null): MediaFilter =>
  value === MediaType.Movie || value === MediaType.Tv ? value : 'all';

const getPage = (value: string | null) => {
  const page = Number(value);

  return Number.isFinite(page) && page > 0 ? page : 1;
};

const getTitle = (item: MultiSearchResult) =>
  item.title ||
  item.name ||
  item.original_title ||
  item.original_name ||
  'Untitled';

const getYear = (item: MultiSearchResult) => {
  const date =
    item.media_type === MediaType.Movie
      ? item.release_date
      : item.first_air_date;

  return date ? date.slice(0, 4) : 'Year unknown';
};

const getTypeLabel = (mediaType: MediaType) =>
  mediaType === MediaType.Movie ? 'Movie' : 'TV Show';

const getDetailHref = (item: MultiSearchResult) =>
  (item.media_type === MediaType.Movie
    ? `/movie/${item.id}`
    : `/tv/show/${item.id}`) as Route;

const getGenreNames = (item: MultiSearchResult) => {
  const genreMap =
    item.media_type === MediaType.Movie ? movieGenreMap : tvGenreMap;

  return (item.genre_ids ?? [])
    .map((genreId) => genreMap[genreId])
    .filter((genre): genre is string => Boolean(genre))
    .slice(0, 3);
};

const isSearchableMediaResult = (
  item: MultiSearchResult
): item is SearchableMediaResult =>
  item.media_type === MediaType.Movie || item.media_type === MediaType.Tv;

const mapMovieSearchResult = (
  movie: MovieListItemType
): SearchableMediaResult => ({
  adult: movie.adult,
  backdrop_path: movie.backdrop_path,
  first_air_date: '',
  genre_ids: movie.genre_ids,
  id: movie.id,
  media_type: MediaType.Movie,
  original_language: movie.original_language,
  original_title: movie.original_title,
  overview: movie.overview,
  popularity: movie.popularity,
  poster_path: movie.poster_path,
  release_date: movie.release_date,
  title: movie.title,
  video: movie.video,
  vote_average: movie.vote_average,
  vote_count: movie.vote_count,
});

const mapTVShowSearchResult = (show: TVShowItem): SearchableMediaResult => ({
  backdrop_path: show.backdrop_path,
  first_air_date: show.first_air_date,
  genre_ids: show.genre_ids,
  id: show.id,
  media_type: MediaType.Tv,
  name: show.name,
  origin_country: show.origin_country,
  original_language: show.original_language,
  original_name: show.original_name,
  overview: show.overview,
  popularity: show.popularity,
  poster_path: show.poster_path,
  vote_average: show.vote_average,
  vote_count: show.vote_count,
});

const SearchResultCard = ({ item }: { item: SearchableMediaResult }) => {
  const title = getTitle(item);
  const genres = getGenreNames(item);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';

  return (
    <Box
      _hover={{ borderColor: 'teal.500', transform: 'translateY(-2px)' }}
      borderColor="gray.300"
      borderRadius={8}
      borderWidth={1}
      overflow="hidden"
      transition="border-color 120ms ease, transform 120ms ease"
    >
      <Grid
        gap={{ base: 4, md: 5 }}
        padding={4}
        templateColumns={{
          base: '96px minmax(0, 1fr)',
          md: '128px minmax(0, 1fr)',
        }}
      >
        <Box asChild>
          <Link href={getDetailHref(item)} prefetch={false}>
            <Image
              alt={`${title} poster`}
              aspectRatio={2 / 3}
              background="gray.800"
              borderRadius={6}
              height="auto"
              objectFit="cover"
              src={
                item.poster_path
                  ? `${IMAGE_URL}${item.poster_path}`
                  : '/Movie Night-bro.svg'
              }
              width="100%"
            />
          </Link>
        </Box>

        <Stack gap={3} minWidth={0}>
          <Box asChild>
            <Link href={getDetailHref(item)} prefetch={false}>
              <Stack gap={2}>
                <Heading
                  as="h2"
                  fontSize={{ base: 'md', md: 'lg' }}
                  lineHeight="1.2"
                >
                  {title}
                </Heading>
                <Flex align="center" gap={2} wrap="wrap">
                  <Badge>{getTypeLabel(item.media_type)}</Badge>
                  <Text color="fg.muted" fontSize="sm">
                    {getYear(item)}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    TMDB {rating}
                  </Text>
                </Flex>
              </Stack>
            </Link>
          </Box>

          {genres.length > 0 ? (
            <Flex gap={2} wrap="wrap">
              {genres.map((genre) => (
                <Badge key={genre} variant="outline">
                  {genre}
                </Badge>
              ))}
            </Flex>
          ) : null}

          <Text color="fg.muted" fontSize="sm" lineClamp={3}>
            {item.overview || 'No description available from TMDB.'}
          </Text>
          <WatchlistStateButton
            mediaType={item.media_type}
            mode="add-only"
            tmdbId={item.id}
          />
        </Stack>
      </Grid>
    </Box>
  );
};

export const MultiSearchPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = getPage(searchParams.get('page'));
  const query = searchParams.get('query') ?? '';
  const mediaFilter = getMediaFilter(searchParams.get('type'));
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    const trimmedQuery = inputValue.trim();

    if (trimmedQuery === query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (trimmedQuery) {
        nextParams.set('query', trimmedQuery);
        nextParams.set('page', '1');
      } else {
        nextParams.delete('query');
        nextParams.delete('page');
      }

      router.push(`${pathname}?${nextParams.toString()}` as Route);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [inputValue, pathname, query, router, searchParams]);

  const shouldSearch = query.length > 0;
  const shouldSearchAll = shouldSearch && mediaFilter === 'all';
  const shouldSearchMovies = shouldSearch && mediaFilter === MediaType.Movie;
  const shouldSearchTVShows = shouldSearch && mediaFilter === MediaType.Tv;

  const multiSearch = useMultiSearchResult(
    {
      page,
      query,
    },
    shouldSearchAll
  );
  const movieSearch = useMovieList(
    'popular',
    {
      page,
      query,
    },
    undefined,
    shouldSearchMovies
  );
  const tvSearch = useTVShowSearchResultList(
    {
      page,
      query,
    },
    shouldSearchTVShows
  );

  const handleChangeFilter = useCallback(
    (updatedFilter: MediaFilter) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (updatedFilter === 'all') {
        nextParams.delete('type');
      } else {
        nextParams.set('type', updatedFilter);
      }

      nextParams.set('page', '1');
      router.push(`${pathname}?${nextParams.toString()}` as Route);
    },
    [pathname, router, searchParams]
  );

  const handleChangePage = useCallback(
    (updatedPage: number) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('page', updatedPage.toString());
      router.push(`${pathname}?${nextParams.toString()}` as Route);
    },
    [pathname, router, searchParams]
  );

  const totalPages = useMemo(() => {
    if (mediaFilter === MediaType.Movie) {
      return movieSearch.data?.total_pages ?? 0;
    }

    if (mediaFilter === MediaType.Tv) {
      return tvSearch.data?.total_pages ?? 0;
    }

    return multiSearch.data?.total_pages ?? 0;
  }, [
    mediaFilter,
    movieSearch.data?.total_pages,
    multiSearch.data?.total_pages,
    tvSearch.data?.total_pages,
  ]);

  const handleClickNext = useCallback(() => {
    const lastPage = totalPages || 1;

    handleChangePage(page >= lastPage ? page : page + 1);
  }, [handleChangePage, page, totalPages]);

  const handleClickPrev = useCallback(() => {
    handleChangePage(page <= 1 ? page : page - 1);
  }, [handleChangePage, page]);

  const results = useMemo(() => {
    if (mediaFilter === MediaType.Movie) {
      return (movieSearch.data?.results ?? []).map(mapMovieSearchResult);
    }

    if (mediaFilter === MediaType.Tv) {
      return (tvSearch.data?.results ?? []).map(mapTVShowSearchResult);
    }

    return (multiSearch.data?.results ?? []).filter(isSearchableMediaResult);
  }, [
    mediaFilter,
    movieSearch.data?.results,
    multiSearch.data?.results,
    tvSearch.data?.results,
  ]);

  let isLoading = multiSearch.isLoading;
  let isError = multiSearch.isError;

  if (mediaFilter === MediaType.Movie) {
    isLoading = movieSearch.isLoading;
    isError = movieSearch.isError;
  }

  if (mediaFilter === MediaType.Tv) {
    isLoading = tvSearch.isLoading;
    isError = tvSearch.isError;
  }

  const pageNavButtonProps: PageNavButtonProps = useMemo(
    () => ({
      isLoading,
      page,
      totalPages,
      onClickNext: handleClickNext,
      onClickPrev: handleClickPrev,
    }),
    [handleClickNext, handleClickPrev, isLoading, page, totalPages]
  );

  const renderResults = () => {
    if (!query) {
      return (
        <Box
          borderColor="gray.300"
          borderRadius={8}
          borderWidth={1}
          padding={5}
        >
          <Text color="white">Search for a movie or TV show to begin.</Text>
        </Box>
      );
    }

    if (isError) {
      return (
        <Box borderColor="red.400" borderRadius={8} borderWidth={1} padding={5}>
          <Text>
            TMDB search is unavailable right now. Please try again shortly.
          </Text>
        </Box>
      );
    }

    if (!isLoading && results.length === 0) {
      return (
        <Box
          borderColor="gray.300"
          borderRadius={8}
          borderWidth={1}
          padding={5}
        >
          <Text color="white">No matching movies or TV shows found.</Text>
        </Box>
      );
    }

    return (
      <>
        <PageNavButtons {...pageNavButtonProps} />
        <Skeleton loading={!!isLoading}>
          <Stack gap={4}>
            {results.map((item) => (
              <SearchResultCard
                item={item}
                key={`${item.media_type}-${item.id}`}
              />
            ))}
          </Stack>
        </Skeleton>
        <PageNavButtons {...pageNavButtonProps} />
      </>
    );
  };

  return (
    <Grid
      gap={6}
      marginBottom={8}
      paddingBottom={{ base: 6, md: 10 }}
      paddingX={{ base: 8, md: 8 }}
      width="full"
    >
      <Stack gap={2}>
        <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
          Search
        </Heading>
        <Text color="white">
          Discover movies and TV shows from TMDB and save them for later.
        </Text>
      </Stack>

      <Stack gap={3}>
        <Field.Root>
          <Field.Label>Search TMDB</Field.Label>
          <Input
            _focusVisible={{
              borderColor: 'white',
              boxShadow: '0 0 0 1px white',
            }}
            _hover={{ borderColor: 'white' }}
            _placeholder={{ color: 'whiteAlpha.700' }}
            borderColor="white"
            borderRadius={24}
            fontSize="sm"
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Movie or TV show"
            type="search"
            value={inputValue}
          />
        </Field.Root>

        <HStack gap={2} wrap="wrap">
          {filterOptions.map((option) => {
            const isActive = mediaFilter === option.value;

            return (
              <Button
                key={option.value}
                onClick={() => handleChangeFilter(option.value)}
                size="sm"
                variant={isActive ? 'solid' : 'outline'}
              >
                {option.label}
              </Button>
            );
          })}
        </HStack>
      </Stack>

      {renderResults()}
    </Grid>
  );
};
