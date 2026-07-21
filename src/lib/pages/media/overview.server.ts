import 'server-only';

import type { MediaOverviewItem } from 'lib/pages/media/overview';
import type { Route } from 'next';

export type MediaListSearchParams = Partial<
  Record<
    | 'include_adult'
    | 'page'
    | 'sort_by'
    | 'vote_average.gte'
    | 'vote_count.gte'
    | 'with_genres',
    string
  >
>;

export type MediaQualityFilter = {
  minVoteAverage: number;
  minVoteCount: number;
};

type QualityScoredMedia = {
  vote_average: number;
  vote_count: number;
};

type HrefParamValue =
  | Array<boolean | number | string>
  | boolean
  | number
  | string
  | null
  | undefined;

export const hasMediaListQuery = (searchParams: MediaListSearchParams) =>
  Boolean(
    searchParams.include_adult ||
      searchParams.page ||
      searchParams.sort_by ||
      searchParams['vote_average.gte'] ||
      searchParams['vote_count.gte'] ||
      searchParams.with_genres
  );

export const buildMediaOverviewHref = <ListType extends string>({
  basePath,
  listType,
  params = {},
}: {
  basePath: string;
  listType: ListType;
  params?: Record<string, HrefParamValue>;
}) => {
  const hrefSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      hrefSearchParams.set(
        key,
        Array.isArray(value) ? value.join(',') : String(value)
      );
    }
  }

  hrefSearchParams.set('page', '1');

  return `${basePath}/${listType}?${hrefSearchParams.toString()}` as Route;
};

export const qualityFilterFromParams = (params: {
  'vote_average.gte'?: number | string;
  'vote_count.gte'?: number | string;
}): MediaQualityFilter => ({
  minVoteAverage: Number(params['vote_average.gte']),
  minVoteCount: Number(params['vote_count.gte']),
});

const filterByQuality = <Item extends QualityScoredMedia>(
  items: Array<Item>,
  filter: MediaQualityFilter
) =>
  items.filter(
    (item) =>
      item.vote_average >= filter.minVoteAverage &&
      item.vote_count >= filter.minVoteCount
  );

// Centralizes the overview shelf shaping so movies and TV keep identical ranking
// behavior while their routes stay focused on route selection.
export const takeMediaOverviewItems = <Item extends QualityScoredMedia>(
  items: Array<Item>,
  filter: MediaQualityFilter,
  mapItem: (item: Item) => MediaOverviewItem,
  uniqueItems: (items: Array<MediaOverviewItem>) => Array<MediaOverviewItem>
) => uniqueItems(filterByQuality(items, filter).map(mapItem));
