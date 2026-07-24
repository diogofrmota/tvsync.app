import 'server-only';

import { MediaGrid } from 'lib/components/shared/MediaGrid';
import type { MediaCardItem } from 'lib/components/shared/media-item';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';
import {
  mapMovieOverviewItem,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import type { MediaListSearchParams } from 'lib/pages/media/overview.server';
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
 * "See All" shows one complete list instead of a pager. TMDB serves 20 titles
 * per page, so six pages leave enough headroom for quality filtering (trending
 * endpoints ignore the vote parameters) to still fill the full list.
 */
const MEDIA_LIST_ITEM_LIMIT = 99;
const MEDIA_LIST_PAGE_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

type MediaListResult = {
  failed: boolean;
  items: Array<MediaCardItem>;
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
  params,
  section,
}: {
  params: MediaListSearchParams;
  section: ListType;
}): Promise<MediaListResult> => {
  const responses = await Promise.allSettled(
    MEDIA_LIST_PAGE_NUMBERS.map((page) =>
      getMovieListServer({ params: listParamsForPage(params, page), section })
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
      MEDIA_LIST_ITEM_LIMIT
    ),
  };
};

const loadTVShowListItems = async ({
  listType,
  params,
}: {
  listType: TVShowListType;
  params: MediaListSearchParams;
}): Promise<MediaListResult> => {
  const responses = await Promise.allSettled(
    MEDIA_LIST_PAGE_NUMBERS.map((page) =>
      getTVShowByListType(listType, listParamsForPage(params, page))
    )
  );
  const shows = resultsFromSettled<TVShowItem>(responses).filter((show) =>
    passesQuality(show, params)
  );

  return {
    failed: responses.every((response) => response.status === 'rejected'),
    items: uniqueMediaOverviewItems(shows.map(mapTVShowOverviewItem)).slice(
      0,
      MEDIA_LIST_ITEM_LIMIT
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
  const { failed, items } = await loadMovieListItems({ params, section });

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
