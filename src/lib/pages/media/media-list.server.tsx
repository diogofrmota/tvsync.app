import 'server-only';

import { MediaGrid } from 'lib/components/shared/MediaGrid';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import { discoveryRailKeyForList } from 'lib/pages/media/discovery-rails';
import {
  discoveryListCacheOptions,
  loadDiscoveryListConfig,
} from 'lib/pages/media/discovery-rails.server';
import {
  mapMovieOverviewItem,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import type { MediaListSearchParams } from 'lib/pages/media/overview.server';
import type { TmdbCacheOptions } from 'lib/services/tmdb/constants';
import { getMovieListServer } from 'lib/services/tmdb/movie/list/index.server';
import type {
  ListType,
  MovieListItemType,
} from 'lib/services/tmdb/movie/list/types';
import { getTVShowByListType } from 'lib/services/tmdb/tv/list/index.server';
import type {
  TVShowItem,
  TVShowListType,
} from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';

/**
 * "See All" shows one complete list instead of a pager. How long that list is
 * comes from the admin-managed configuration for the list being opened, so the
 * complete list is exactly as long as the rail that linked to it promised; a
 * route with no managed list behind it keeps the shipped default.
 */
const MEDIA_LIST_ITEM_LIMIT = 30;
const TMDB_PAGE_SIZE = 20;
const MEDIA_LIST_MAX_PAGES = 6;

/**
 * TMDB serves 20 titles per page, and the curated endpoints ignore the vote
 * parameters, so two extra pages leave headroom for quality filtering to still
 * fill the requested list. A smaller list therefore also costs fewer requests.
 */
const pageNumbersForLimit = (limit: number) =>
  Array.from(
    {
      length: Math.min(
        MEDIA_LIST_MAX_PAGES,
        Math.ceil(limit / TMDB_PAGE_SIZE) + 2
      ),
    },
    (_, index) => index + 1
  );

type MediaListResult = {
  failed: boolean;
  items: Array<MediaCardItem>;
};

type ManagedListConfig = {
  cache?: TmdbCacheOptions;
  itemLimit: number;
};

/**
 * Resolves the managed list a "See All" route belongs to. Genre lists are not
 * managed from the dashboard, so they keep the default size and cache window.
 */
const resolveManagedList = async (input: {
  isGenreList?: boolean;
  isMovie: boolean;
  listType: string;
}): Promise<ManagedListConfig> => {
  const key = input.isGenreList
    ? null
    : discoveryRailKeyForList({
        isMovie: input.isMovie,
        listType: input.listType,
      });
  const config = key ? await loadDiscoveryListConfig(key) : null;

  if (!(key && config)) {
    return { itemLimit: MEDIA_LIST_ITEM_LIMIT };
  }

  return {
    cache: discoveryListCacheOptions({
      key,
      revalidateSeconds: config.revalidateSeconds,
    }),
    itemLimit: config.itemLimit,
  };
};

type QualityScoredMedia = {
  vote_average: number;
  vote_count: number;
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const listSubtitle = (value: string) => capitalize(value.replaceAll('_', ' '));

const optionalNumber = (value?: string) => {
  const parsed = Number(value);

  return value && Number.isFinite(parsed) ? parsed : undefined;
};

const listParamsForPage = (params: MediaListSearchParams, page: number) => ({
  include_adult: params.include_adult,
  page,
  sort_by: params.sort_by,
  'vote_average.gte': params['vote_average.gte'],
  'vote_count.gte': params['vote_count.gte'],
  with_genres: params.with_genres,
});

const resultsFromSettled = <Item,>(
  responses: Array<PromiseSettledResult<{ results: Array<Item> }>>
) =>
  responses.flatMap((response) =>
    response.status === 'fulfilled' ? response.value.results : []
  );

// Curated endpoints such as /movie/popular and /trending/* ignore the discover
// vote parameters, so the requested quality floor is re-applied here to keep
// every rail and its "See All" list consistent.
const passesQuality = (
  item: QualityScoredMedia,
  params: MediaListSearchParams
) => {
  const minVoteAverage = optionalNumber(params['vote_average.gte']);
  const minVoteCount = optionalNumber(params['vote_count.gte']);

  if (minVoteAverage !== undefined && item.vote_average < minVoteAverage) {
    return false;
  }

  return !(minVoteCount !== undefined && item.vote_count < minVoteCount);
};

const loadMovieListItems = async ({
  managed,
  params,
  section,
}: {
  managed: ManagedListConfig;
  params: MediaListSearchParams;
  section: ListType;
}): Promise<MediaListResult> => {
  const responses = await Promise.allSettled(
    pageNumbersForLimit(managed.itemLimit).map((page) =>
      getMovieListServer({
        cache: managed.cache,
        params: listParamsForPage(params, page),
        section,
      })
    )
  );
  const movies = resultsFromSettled<MovieListItemType>(responses).filter(
    (movie) =>
      !(params.include_adult === 'false' && movie.adult) &&
      passesQuality(movie, params)
  );

  return {
    failed: responses.every((response) => response.status === 'rejected'),
    items: uniqueMediaOverviewItems(movies.map(mapMovieOverviewItem)).slice(
      0,
      managed.itemLimit
    ),
  };
};

const loadTVShowListItems = async ({
  listType,
  managed,
  params,
}: {
  listType: TVShowListType;
  managed: ManagedListConfig;
  params: MediaListSearchParams;
}): Promise<MediaListResult> => {
  const responses = await Promise.allSettled(
    pageNumbersForLimit(managed.itemLimit).map((page) =>
      getTVShowByListType(
        listType,
        listParamsForPage(params, page),
        managed.cache
      )
    )
  );
  const shows = resultsFromSettled<TVShowItem>(responses).filter((show) =>
    passesQuality(show, params)
  );

  return {
    failed: responses.every((response) => response.status === 'rejected'),
    items: uniqueMediaOverviewItems(shows.map(mapTVShowOverviewItem)).slice(
      0,
      managed.itemLimit
    ),
  };
};

const MediaListView = ({
  failed,
  items,
  mediaType,
  subtitle,
  title,
}: MediaListResult & {
  mediaType: MediaType.Movie | MediaType.Tv;
  subtitle: string;
  title: string;
}) => (
  <PageShell>
    <PageHeading subtitle={subtitle} title={title} />
    {items.length > 0 ? (
      <MediaGrid items={items} mediaType={mediaType} />
    ) : (
      <StatePanel
        message={
          failed
            ? 'This list could not be loaded from TMDB. Please try again shortly.'
            : 'There are no titles available in this list right now.'
        }
        title={failed ? 'Unable to load titles' : 'No titles available'}
        tone={failed ? 'error' : 'neutral'}
      />
    )}
  </PageShell>
);

export const MovieListPage = async ({
  genre,
  searchParams,
  section,
}: {
  genre?: string;
  searchParams: MediaListSearchParams;
  section: ListType;
}) => {
  const params = genre ? { ...searchParams, with_genres: genre } : searchParams;
  const managed = await resolveManagedList({
    isGenreList: Boolean(genre),
    isMovie: true,
    listType: section,
  });
  const { failed, items } = await loadMovieListItems({
    managed,
    params,
    section,
  });

  return (
    <MediaListView
      failed={failed}
      items={items}
      mediaType={MediaType.Movie}
      subtitle={genre ? `Genre ${genre}` : listSubtitle(section)}
      title="Movies"
    />
  );
};

export const TVShowListPage = async ({
  listType,
  searchParams,
}: {
  listType: TVShowListType;
  searchParams: MediaListSearchParams;
}) => {
  const { failed, items } = await loadTVShowListItems({
    listType,
    managed: await resolveManagedList({ isMovie: false, listType }),
    params: searchParams,
  });

  return (
    <MediaListView
      failed={failed}
      items={items}
      mediaType={MediaType.Tv}
      subtitle={listSubtitle(listType)}
      title="TV Shows"
    />
  );
};
