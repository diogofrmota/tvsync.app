'use client';

import {
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
} from '@chakra-ui/react';
import PageNavButtons, {
  type PageNavButtonProps,
} from 'lib/components/shared/list/page-nav-buttons';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionLoading, StatePanel } from 'lib/components/shared/Section';
import { WatchlistStateButton } from 'lib/features/watchlist';
import { useMovieList } from 'lib/services/tmdb/movie/list/index.client';
import type { MovieListItemType } from 'lib/services/tmdb/movie/list/types';
import {
  useTVShowByList,
  useTVShowSearchResultList,
} from 'lib/services/tmdb/tv/list/index.client';
import type { TVShowItem } from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type SearchMediaType = MediaType.Movie | MediaType.Tv;
type SearchItem = {
  date: string;
  id: number;
  mediaType: SearchMediaType;
  popularity: number;
  posterPath: string | null;
  rating: number;
  title: string;
};
type SortKey = 'popularity' | 'rating' | 'release';

const getPage = (value: string | null) => {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? page : 1;
};
const getMediaType = (value: string | null): SearchMediaType =>
  value === MediaType.Tv ? MediaType.Tv : MediaType.Movie;
const mapMovie = (item: MovieListItemType): SearchItem => ({
  date: item.release_date,
  id: item.id,
  mediaType: MediaType.Movie,
  popularity: item.popularity,
  posterPath: item.poster_path,
  rating: item.vote_average,
  title: item.title,
});
const mapTV = (item: TVShowItem): SearchItem => ({
  date: item.first_air_date,
  id: item.id,
  mediaType: MediaType.Tv,
  popularity: item.popularity,
  posterPath: item.poster_path,
  rating: item.vote_average,
  title: item.name,
});

export const MultiSearchPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = getPage(searchParams.get('page'));
  const query = searchParams.get('query') ?? '';
  const mediaType = getMediaType(searchParams.get('type'));
  const [inputValue, setInputValue] = useState(query);
  const [sort, setSort] = useState<SortKey>('popularity');

  useEffect(() => setInputValue(query), [query]);
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed === query) {
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set('query', trimmed);
      } else {
        params.delete('query');
      }
      params.set('page', '1');
      router.push(`${pathname}?${params}` as Route);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [inputValue, pathname, query, router, searchParams]);

  const movie = useMovieList(
    'popular',
    { page, query },
    undefined,
    mediaType === MediaType.Movie
  );
  const tvBrowse = useTVShowByList({
    isReady: mediaType === MediaType.Tv && !query,
    listType: 'popular',
    params: { page },
  });
  const tvSearch = useTVShowSearchResultList(
    { page, query },
    mediaType === MediaType.Tv && Boolean(query)
  );
  let isLoading = movie.isLoading;
  let isError = movie.isError;
  let totalPages = movie.data?.total_pages ?? 0;
  if (mediaType === MediaType.Tv && query) {
    isLoading = tvSearch.isLoading;
    isError = tvSearch.isError;
    totalPages = tvSearch.data?.total_pages ?? 0;
  } else if (mediaType === MediaType.Tv) {
    isLoading = tvBrowse.isLoading;
    isError = tvBrowse.isError;
    totalPages = tvBrowse.data?.total_pages ?? 0;
  }
  const rawItems =
    mediaType === MediaType.Movie
      ? (movie.data?.results ?? []).map(mapMovie)
      : ((query ? tvSearch.data?.results : tvBrowse.data?.results) ?? []).map(
          mapTV
        );
  const items = useMemo(
    () =>
      rawItems
        .toSorted((left, right) => {
          if (sort === 'rating') {
            return right.rating - left.rating;
          }
          if (sort === 'release') {
            return (right.date || '').localeCompare(left.date || '');
          }
          return right.popularity - left.popularity;
        })
        .slice(0, 27),
    [rawItems, sort]
  );
  const changeParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }
      router.push(`${pathname}?${params}` as Route);
    },
    [pathname, router, searchParams]
  );
  const navProps: PageNavButtonProps = {
    isLoading,
    page,
    totalPages,
    onClickNext: () =>
      changeParams({ page: String(Math.min(page + 1, totalPages || 1)) }),
    onClickPrev: () => changeParams({ page: String(Math.max(page - 1, 1)) }),
  };

  const renderResults = () => {
    if (isError) {
      return (
        <StatePanel
          message="Search is unavailable right now. Please try again shortly."
          title="Unable to load results"
          tone="error"
        />
      );
    }
    if (isLoading) {
      return <SectionLoading />;
    }
    if (items.length === 0) {
      return (
        <StatePanel
          message="Try another title or change the selected content type."
          title="No titles found"
        />
      );
    }
    return (
      <>
        <Grid
          columnGap={{ base: 3, md: 5 }}
          rowGap={{ base: 7, md: 9 }}
          templateColumns={{
            base: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(6, minmax(0, 1fr))',
            xl: 'repeat(9, minmax(0, 1fr))',
          }}
        >
          {items.map((item) => (
            <PosterCard
              actions={
                <WatchlistStateButton
                  mediaType={item.mediaType}
                  mode="add-only"
                  size="xs"
                  tmdbId={item.id}
                />
              }
              id={item.id}
              imageUrl={item.posterPath}
              key={`${item.mediaType}-${item.id}`}
              layout="grid"
              mediaType={item.mediaType}
              name={item.title}
              prefetch={false}
            />
          ))}
        </Grid>
        <PageNavButtons {...navProps} />
      </>
    );
  };

  return (
    <PageShell>
      <PageHeading
        subtitle="Find movies and TV shows, then add them to your library."
        title="Search"
      />
      <Stack gap={4}>
        <HStack aria-label="Content type" as="div" gap={2} role="tablist">
          {[
            { label: 'Movies', value: MediaType.Movie },
            { label: 'TV Shows', value: MediaType.Tv },
          ].map((tab) => (
            <Button
              aria-selected={mediaType === tab.value}
              key={tab.value}
              onClick={() => changeParams({ type: tab.value, page: '1' })}
              role="tab"
              size="sm"
              variant={mediaType === tab.value ? 'solid' : 'outline'}
            >
              {tab.label}
            </Button>
          ))}
        </HStack>
        <Grid
          gap={4}
          templateColumns={{ base: '1fr', md: 'minmax(0, 1fr) 14rem' }}
        >
          <Field.Root>
            <Field.Label>Search by title</Field.Label>
            <Input
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={
                mediaType === MediaType.Movie ? 'Movie title' : 'TV show title'
              }
              type="search"
              value={inputValue}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Sort results</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                onChange={(event) => setSort(event.target.value as SortKey)}
                value={sort}
              >
                <option value="popularity">Popularity</option>
                <option value="rating">Rating</option>
                <option value="release">Release date</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </Grid>
      </Stack>
      {renderResults()}
    </PageShell>
  );
};
