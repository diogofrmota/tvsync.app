'use client';

import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Heading,
  Image,
  Input,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/PosterImage';
import { MediaStatusControl } from 'lib/features/tracking';
import { WatchlistButton } from 'lib/features/watchlist';
import {
  MediaType,
  MOVIE_WATCH_STATUSES,
  type TrackableMediaType,
  TV_WATCH_STATUSES,
  WatchStatus,
} from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type WatchlistPageItem = {
  dateAdded: string;
  id: string;
  mediaType: MediaType.Movie | MediaType.Tv;
  overview: string;
  posterPath: null | string;
  releaseDate: string;
  status: WatchStatus | null;
  title: string;
  tmdbId: number;
  voteAverage: number;
};

type WatchlistPageProps = {
  emptyDescription?: string;
  fixedMediaType?: TrackableMediaType;
  items: Array<WatchlistPageItem>;
  subtitle?: string;
  title?: string;
};

type MediaFilter = 'all' | MediaType.Movie | MediaType.Tv;
type SortKey = 'date-added' | 'release-date' | 'rating' | 'title';

const filters: Array<{ label: string; value: MediaFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: MediaType.Movie },
  { label: 'TV Shows', value: MediaType.Tv },
];

const statusLabels: Record<WatchStatus | 'uncategorized', string> = {
  [WatchStatus.Completed]: 'Finished',
  [WatchStatus.Dropped]: 'Dropped',
  [WatchStatus.Paused]: 'Paused',
  [WatchStatus.Planned]: 'Plan to Watch',
  [WatchStatus.Watched]: 'Finished',
  [WatchStatus.Watching]: 'Watching',
  uncategorized: 'Saved',
};

const getDetailHref = (item: WatchlistPageItem) =>
  (item.mediaType === MediaType.Movie
    ? `/movie/${item.tmdbId}`
    : `/tv/show/${item.tmdbId}`) as Route;

const getTypeLabel = (mediaType: MediaType.Movie | MediaType.Tv) =>
  mediaType === MediaType.Movie ? 'Movie' : 'TV Show';

const getYear = (date: string) => (date ? date.slice(0, 4) : 'Unknown');

const compareDatesDesc = (leftDate: string, rightDate: string) =>
  new Date(rightDate || 0).getTime() - new Date(leftDate || 0).getTime();

const WatchlistItemCard = ({ item }: { item: WatchlistPageItem }) => {
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : 'NR';

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
          base: '92px minmax(0, 1fr)',
          md: '128px minmax(0, 1fr) auto',
        }}
      >
        <Box asChild>
          <Link href={getDetailHref(item)} prefetch={false}>
            <Image
              alt={`${item.title} poster`}
              aspectRatio={2 / 3}
              background="gray.800"
              borderRadius={6}
              height="auto"
              objectFit="cover"
              src={
                item.posterPath
                  ? `${IMAGE_URL}${item.posterPath}`
                  : '/Movie Night-bro.svg'
              }
              width="100%"
            />
          </Link>
        </Box>

        <Stack gap={3} minWidth={0}>
          <Stack gap={2}>
            <Heading asChild fontSize={{ base: 'md', md: 'lg' }}>
              <Link href={getDetailHref(item)} prefetch={false}>
                {item.title}
              </Link>
            </Heading>
            <Flex align="center" gap={2} wrap="wrap">
              <Badge>{getTypeLabel(item.mediaType)}</Badge>
              <Text color="fg.muted" fontSize="sm">
                {getYear(item.releaseDate)}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                TMDB {rating}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Added {new Date(item.dateAdded).toLocaleDateString()}
              </Text>
            </Flex>
          </Stack>

          <Text color="fg.muted" fontSize="sm" lineClamp={3}>
            {item.overview || 'No description available from TMDB.'}
          </Text>

          <MediaStatusControl
            initialStatus={item.status}
            label="Status"
            mediaType={item.mediaType}
            size="sm"
            tmdbId={item.tmdbId}
          />

          <Box display={{ base: 'block', md: 'none' }}>
            <WatchlistButton
              initialIsSaved
              mediaType={item.mediaType}
              tmdbId={item.tmdbId}
            />
          </Box>
        </Stack>

        <Box display={{ base: 'none', md: 'block' }}>
          <WatchlistButton
            initialIsSaved
            mediaType={item.mediaType}
            tmdbId={item.tmdbId}
          />
        </Box>
      </Grid>
    </Box>
  );
};

const WatchlistSection = ({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: Array<WatchlistPageItem>;
  title: string;
}) => (
  <Stack gap={4}>
    <Flex align="baseline" gap={3} wrap="wrap">
      <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="500">
        {title}
      </Heading>
      <Text color="fg.muted" fontSize="sm">
        {items.length} saved
      </Text>
    </Flex>

    {items.length === 0 ? (
      <Box borderColor="gray.300" borderRadius={8} borderWidth={1} padding={5}>
        <Text color="fg.muted">{emptyLabel}</Text>
      </Box>
    ) : (
      <Stack gap={4}>
        {items.map((item) => (
          <WatchlistItemCard item={item} key={item.id} />
        ))}
      </Stack>
    )}
  </Stack>
);

const WatchlistSearchBar = ({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (query: string) => void;
}) => (
  <Input
    _focusVisible={{
      borderColor: 'white',
      boxShadow: '0 0 0 1px white',
    }}
    _hover={{ borderColor: 'white' }}
    _placeholder={{ color: 'whiteAlpha.700' }}
    aria-label="Search watchlist"
    borderColor="white"
    borderRadius={24}
    onChange={(event) => setQuery(event.target.value)}
    placeholder="Search watchlist"
    type="search"
    value={query}
  />
);

const getDedicatedStatuses = (mediaType?: TrackableMediaType) => {
  if (mediaType === MediaType.Movie) {
    return MOVIE_WATCH_STATUSES;
  }

  if (mediaType === MediaType.Tv) {
    return TV_WATCH_STATUSES;
  }

  return [];
};

const WatchlistControls = ({
  filter,
  fixedMediaType,
  setFilter,
  setSortKey,
  sortKey,
}: {
  filter: MediaFilter;
  fixedMediaType?: TrackableMediaType;
  setFilter: (filter: MediaFilter) => void;
  setSortKey: (sortKey: SortKey) => void;
  sortKey: SortKey;
}) => (
  <>
    <Grid gap={3} templateColumns={{ base: '1fr', md: '220px' }}>
      <Field.Root>
        <Field.Label>Sort</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            value={sortKey}
          >
            <option value="date-added">Date added</option>
            <option value="release-date">Release date</option>
            <option value="rating">Rating</option>
            <option value="title">Title A-Z</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
    </Grid>

    {fixedMediaType ? null : (
      <Flex gap={2} wrap="wrap">
        {filters.map((option) => (
          <Button
            key={option.value}
            onClick={() => setFilter(option.value)}
            size="sm"
            variant={filter === option.value ? 'solid' : 'outline'}
          >
            {option.label}
          </Button>
        ))}
      </Flex>
    )}
  </>
);

const DedicatedWatchlistSections = ({
  filteredItems,
  fixedMediaType,
}: {
  filteredItems: Array<WatchlistPageItem>;
  fixedMediaType: TrackableMediaType;
}) => {
  const dedicatedSections = getDedicatedStatuses(fixedMediaType).map(
    (status) => ({
      emptyLabel: `No ${statusLabels[status].toLowerCase()} titles match those filters.`,
      items: filteredItems.filter((item) => item.status === status),
      title: statusLabels[status],
    })
  );
  const uncategorizedItems = filteredItems.filter((item) => !item.status);

  return (
    <>
      {dedicatedSections.map((section) => (
        <WatchlistSection
          emptyLabel={section.emptyLabel}
          items={section.items}
          key={section.title}
          title={section.title}
        />
      ))}
      {uncategorizedItems.length > 0 ? (
        <WatchlistSection
          emptyLabel="No saved titles match those filters."
          items={uncategorizedItems}
          title="Saved"
        />
      ) : null}
    </>
  );
};

const CombinedWatchlistSections = ({
  activeFilter,
  filteredItems,
}: {
  activeFilter: MediaFilter;
  filteredItems: Array<WatchlistPageItem>;
}) => {
  const movieItems = filteredItems.filter(
    (item) => item.mediaType === MediaType.Movie
  );
  const tvItems = filteredItems.filter(
    (item) => item.mediaType === MediaType.Tv
  );
  const showMovies = activeFilter === 'all' || activeFilter === MediaType.Movie;
  const showTvShows = activeFilter === 'all' || activeFilter === MediaType.Tv;

  return (
    <>
      {showMovies ? (
        <WatchlistSection
          emptyLabel="No saved movies match those filters."
          items={movieItems}
          title="Movies"
        />
      ) : null}

      {showTvShows ? (
        <WatchlistSection
          emptyLabel="No saved TV shows match those filters."
          items={tvItems}
          title="TV Shows"
        />
      ) : null}
    </>
  );
};

const WatchlistResults = ({
  activeFilter,
  filteredItems,
  fixedMediaType,
}: {
  activeFilter: MediaFilter;
  filteredItems: Array<WatchlistPageItem>;
  fixedMediaType?: TrackableMediaType;
}) => {
  if (filteredItems.length === 0) {
    return (
      <Box borderColor="gray.300" borderRadius={8} borderWidth={1} padding={5}>
        <Text color="fg.muted">No saved titles match those filters.</Text>
      </Box>
    );
  }

  return (
    <Stack gap={8}>
      {fixedMediaType ? (
        <DedicatedWatchlistSections
          filteredItems={filteredItems}
          fixedMediaType={fixedMediaType}
        />
      ) : (
        <CombinedWatchlistSections
          activeFilter={activeFilter}
          filteredItems={filteredItems}
        />
      )}
    </Stack>
  );
};

export const WatchlistPage = ({
  emptyDescription = 'Search TMDB and add movies or TV shows to build your watchlist.',
  fixedMediaType,
  items,
  subtitle = 'Movies and TV shows you saved for later.',
  title = 'Watchlist',
}: WatchlistPageProps) => {
  const [filter, setFilter] = useState<MediaFilter>(fixedMediaType ?? 'all');
  const [sortKey, setSortKey] = useState<SortKey>('date-added');
  const [query, setQuery] = useState('');
  const activeFilter = fixedMediaType ?? filter;

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items
      .filter(
        (item) => activeFilter === 'all' || item.mediaType === activeFilter
      )
      .filter((item) =>
        normalizedQuery
          ? item.title.toLowerCase().includes(normalizedQuery)
          : true
      )
      .toSorted((left, right) => {
        if (sortKey === 'release-date') {
          return compareDatesDesc(left.releaseDate, right.releaseDate);
        }

        if (sortKey === 'rating') {
          return right.voteAverage - left.voteAverage;
        }

        if (sortKey === 'title') {
          return left.title.localeCompare(right.title);
        }

        return compareDatesDesc(left.dateAdded, right.dateAdded);
      });
  }, [activeFilter, items, query, sortKey]);

  return (
    <Grid
      gap={6}
      paddingBottom={{ base: 8, md: 12 }}
      paddingX={{ base: 8, md: 8 }}
    >
      <Grid
        alignItems="end"
        gap={{ base: 5, md: 8 }}
        templateColumns={{
          base: '1fr',
          md: 'minmax(0, 1fr) minmax(20rem, 36rem)',
        }}
      >
        <Stack gap={2}>
          <Heading
            as="h1"
            fontSize={{ base: '2xl', md: '4xl' }}
            fontWeight="500"
          >
            {title}
          </Heading>
          <Text color="white">{subtitle}</Text>
        </Stack>
        <WatchlistSearchBar query={query} setQuery={setQuery} />
      </Grid>

      {items.length === 0 ? (
        <Grid
          borderColor="gray.300"
          borderRadius={8}
          borderWidth={1}
          gap={4}
          padding={6}
        >
          <Stack gap={2}>
            <Heading as="h2" fontSize="lg" fontWeight="500">
              Nothing saved yet
            </Heading>
            <Text color="white">{emptyDescription}</Text>
          </Stack>
          <Button alignSelf="flex-start" asChild>
            <Link href={'/search' as Route}>Search titles</Link>
          </Button>
        </Grid>
      ) : (
        <>
          <WatchlistControls
            filter={filter}
            fixedMediaType={fixedMediaType}
            setFilter={setFilter}
            setSortKey={setSortKey}
            sortKey={sortKey}
          />
          <WatchlistResults
            activeFilter={activeFilter}
            filteredItems={filteredItems}
            fixedMediaType={fixedMediaType}
          />
        </>
      )}
    </Grid>
  );
};
