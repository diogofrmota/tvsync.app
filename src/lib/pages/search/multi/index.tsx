'use client';

import {
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react';
import PageNavButtons, {
  type PageNavButtonProps,
} from 'lib/components/shared/list/page-nav-buttons';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import PosterCard from 'lib/components/shared/PosterCard';
import { SectionLoading, StatePanel } from 'lib/components/shared/Section';
import {
  getSearchStatusLabel,
  SearchLibraryAction,
} from 'lib/features/library/search-library-action';
import type { SearchLibraryItem } from 'lib/pages/search/search-state';
import {
  getSearchGenre,
  getSearchMediaType,
  getSearchPage,
  getSearchSort,
  SEARCH_RESULTS_PER_PAGE,
} from 'lib/pages/search/search-state';
import { useSearchResults } from 'lib/pages/search/use-search-results';
import { useGenreList } from 'lib/services/tmdb/genre/index.client';
import { MediaType, type WatchStatus } from 'lib/types';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

const getLibraryKey = (
  mediaType: MediaType.Movie | MediaType.Tv,
  tmdbId: number
) => `${mediaType}:${tmdbId}`;

const searchTabs = [
  { id: 'search-tab-movies', label: 'Movies', value: MediaType.Movie },
  { id: 'search-tab-tv', label: 'TV Shows', value: MediaType.Tv },
] as const;

type MultiSearchPageProps = {
  initialLibraryItems: Array<SearchLibraryItem>;
};

export const MultiSearchPage = ({
  initialLibraryItems,
}: MultiSearchPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = getSearchPage(searchParams.get('page'));
  const query = (searchParams.get('query') ?? '').trim();
  const genre = getSearchGenre(searchParams.get('genre'));
  const mediaType = getSearchMediaType(searchParams.get('type'));
  const sort = getSearchSort(searchParams.get('sort'));
  const [inputValue, setInputValue] = useState(query);
  const [libraryStatuses, setLibraryStatuses] = useState<
    Record<string, WatchStatus>
  >(() =>
    Object.fromEntries(
      initialLibraryItems.map((item) => [
        getLibraryKey(item.mediaType, item.tmdbId),
        item.status,
      ])
    )
  );

  useEffect(() => setInputValue(query), [query]);

  const changeParams = useCallback(
    (
      updates: Record<string, string | null>,
      navigation: 'push' | 'replace' = 'push'
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      const href = `${pathname}?${params.toString()}` as Route;
      router[navigation](href);
    },
    [pathname, router, searchParams]
  );

  const genreList = useGenreList(mediaType);
  const { isError, isLoading, items, retry, totalPages } = useSearchResults({
    genre,
    mediaType,
    page,
    query,
    sort,
  });

  useEffect(() => {
    if (!(isLoading || isError) && totalPages > 0 && page > totalPages) {
      changeParams({ page: String(totalPages) }, 'replace');
    }
  }, [changeParams, isError, isLoading, page, totalPages]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeParams({ page: '1', query: inputValue.trim() || null });
  };

  const selectTab = (nextMediaType: MediaType.Movie | MediaType.Tv) => {
    changeParams({ genre: null, page: '1', type: nextMediaType });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const selectMovies =
      event.key === 'Home' ||
      (event.key === 'ArrowLeft' && mediaType === MediaType.Tv) ||
      (event.key === 'ArrowRight' && mediaType === MediaType.Tv);
    const nextMediaType = selectMovies ? MediaType.Movie : MediaType.Tv;
    selectTab(nextMediaType);
    document
      .getElementById(
        nextMediaType === MediaType.Movie
          ? 'search-tab-movies'
          : 'search-tab-tv'
      )
      ?.focus();
  };

  const navProps: PageNavButtonProps = {
    isLoading,
    page,
    totalPages,
    onClickNext: () =>
      changeParams({ page: String(Math.min(page + 1, totalPages)) }),
    onClickPrev: () => changeParams({ page: String(Math.max(page - 1, 1)) }),
  };

  const renderResults = () => {
    if (isError) {
      return (
        <StatePanel
          action={
            <Button onClick={retry} size="sm" variant="outline">
              Try again
            </Button>
          }
          message="Search is unavailable right now. Your filters have been preserved."
          title="Unable to load results"
          tone="error"
        />
      );
    }
    if (isLoading) {
      return (
        <Stack aria-label={`Loading page ${page}`} role="status">
          <SectionLoading count={SEARCH_RESULTS_PER_PAGE} />
        </Stack>
      );
    }
    if (items.length === 0) {
      return (
        <StatePanel
          message="Try another title or change the selected genre or sort order."
          title="No titles found"
        />
      );
    }

    return (
      <>
        <Text aria-live="polite" color="fg.muted" fontSize="sm" role="status">
          Showing {items.length}{' '}
          {mediaType === MediaType.Movie ? 'movies' : 'TV shows'} on page {page}
          .
        </Text>
        <Grid
          columnGap={{ base: 3, md: 5 }}
          rowGap={{ base: 7, md: 9 }}
          templateColumns={{
            base: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(auto-fill, minmax(8.5rem, 1fr))',
          }}
        >
          {items.map((item) => {
            const libraryKey = getLibraryKey(item.mediaType, item.id);
            const status = libraryStatuses[libraryKey] ?? null;

            return (
              <PosterCard
                actions={
                  <SearchLibraryAction
                    mediaType={item.mediaType}
                    onStatusChange={(nextStatus) =>
                      setLibraryStatuses((current) => ({
                        ...current,
                        [libraryKey]: nextStatus,
                      }))
                    }
                    status={status}
                    title={item.title}
                    tmdbId={item.id}
                  />
                }
                id={item.id}
                imageUrl={item.posterPath}
                key={libraryKey}
                layout="grid"
                mediaType={item.mediaType}
                name={item.title}
                prefetch={false}
                status={getSearchStatusLabel(status)}
              />
            );
          })}
        </Grid>
        <PageNavButtons {...navProps} />
      </>
    );
  };

  const activeTabId =
    mediaType === MediaType.Movie ? 'search-tab-movies' : 'search-tab-tv';

  return (
    <PageShell>
      <PageHeading
        subtitle="Browse and search one content type at a time, then add titles to your library."
        title="Search"
      />
      <Stack gap={5}>
        <HStack aria-label="Content type" gap={2} role="tablist">
          {searchTabs.map((tab) => (
            <Button
              aria-controls="search-results-panel"
              aria-selected={mediaType === tab.value}
              id={tab.id}
              key={tab.value}
              onClick={() => selectTab(tab.value)}
              onKeyDown={handleTabKeyDown}
              role="tab"
              size="sm"
              tabIndex={mediaType === tab.value ? 0 : -1}
              variant={mediaType === tab.value ? 'solid' : 'outline'}
            >
              {tab.label}
            </Button>
          ))}
        </HStack>
        <form onSubmit={submitSearch}>
          <Stack gap={4}>
            <Field.Root>
              <Field.Label>Search by title</Field.Label>
              <HStack align="stretch">
                <Input
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder={
                    mediaType === MediaType.Movie
                      ? 'Enter a movie title'
                      : 'Enter a TV show title'
                  }
                  type="search"
                  value={inputValue}
                />
                <Button type="submit">Search</Button>
              </HStack>
            </Field.Root>
            <Grid gap={4} templateColumns={{ base: '1fr', md: '1fr 1fr' }}>
              <Field.Root disabled={genreList.isLoading}>
                <Field.Label>Filter by genre</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    onChange={(event) =>
                      changeParams({
                        genre: event.target.value || null,
                        page: '1',
                      })
                    }
                    value={genre}
                  >
                    <option value="">All genres</option>
                    {(genreList.data?.genres ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {genreList.isError ? (
                  <Text color="red.500" fontSize="xs" role="alert">
                    Genres are unavailable. You can still browse all genres.
                  </Text>
                ) : null}
              </Field.Root>
              <Field.Root>
                <Field.Label>Sort results</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    onChange={(event) =>
                      changeParams({ page: '1', sort: event.target.value })
                    }
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
            {query ? (
              <Text color="fg.muted" fontSize="xs">
                TMDB returns title searches by relevance. Genre and sorting
                apply to the results loaded on this page.
              </Text>
            ) : null}
          </Stack>
        </form>
      </Stack>
      <Stack
        aria-labelledby={activeTabId}
        gap={5}
        id="search-results-panel"
        role="tabpanel"
      >
        {renderResults()}
      </Stack>
    </PageShell>
  );
};
