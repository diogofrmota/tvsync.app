import 'server-only';

import {
  MediaOverviewPage,
  mapTVShowOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import {
  buildMediaOverviewHref,
  type MediaQualityFilter,
  qualityFilterFromParams,
  takeMediaOverviewItems,
} from 'lib/pages/media/overview.server';
import {
  getDiscoverTVShowsServer,
  getTrendingTVShowsServer,
} from 'lib/services/tmdb/tv/list/index.server';
import type {
  TVShowItem,
  TVShowListParams,
  TVShowListType,
} from 'lib/services/tmdb/tv/list/types';
import { MediaType } from 'lib/types';
import type { Metadata } from 'next';

const listTypeLabels: Record<string, string> = {
  airing_today: 'TV Shows Airing Today',
  on_the_air: 'TV Shows On The Air',
  popular: 'Popular TV Shows',
  top_rated: 'Top Rated TV Shows',
  trending_week: 'Trending TV Shows This Week',
};

const trendingTVShowQuality = {
  minVoteAverage: 5.5,
  minVoteCount: 150,
} as const;

const popularTVShowDiscoverParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '500',
} satisfies TVShowListParams;

const highestRatedTVShowDiscoverParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '1500',
} satisfies TVShowListParams;

const defaultGenreTVShowDiscoverParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6.3',
  'vote_count.gte': '200',
} satisfies TVShowListParams;

const tvGenreSections = [
  { genreId: 18, title: 'Best Drama TV Shows' },
  { genreId: 35, title: 'Best Comedy TV Shows' },
  { genreId: 10_759, title: 'Best Action & Adventure TV Shows' },
  { genreId: 9648, title: 'Best Mystery TV Shows' },
  { genreId: 80, title: 'Best Crime TV Shows' },
  {
    genreId: 10_764,
    params: {
      'vote_average.gte': '5.8',
      'vote_count.gte': '100',
    },
    title: 'Best Reality TV Shows',
  },
] as const;

const buildTVShowHref = (
  listType: TVShowListType,
  params: TVShowListParams = {}
) =>
  buildMediaOverviewHref({
    basePath: '/tv',
    listType,
    params,
  });

const tvGenreParams = (
  section: (typeof tvGenreSections)[number]
): TVShowListParams => ({
  ...defaultGenreTVShowDiscoverParams,
  ...('params' in section ? section.params : {}),
  with_genres: String(section.genreId),
});

const tvGenreHref = (section: (typeof tvGenreSections)[number]) =>
  buildTVShowHref('popular', tvGenreParams(section));

const takeTVShowItems = (
  shows: Array<TVShowItem>,
  filter: MediaQualityFilter
) =>
  takeMediaOverviewItems(
    shows,
    filter,
    mapTVShowOverviewItem,
    uniqueMediaOverviewItems
  );

export const getTVShowListMetadata = (listType: TVShowListType): Metadata => {
  const title = listTypeLabels[listType] ?? 'TV Shows';
  const description = `Browse ${title.toLowerCase()} from TMDB on TVSync.`;

  return {
    title: `${title} | TVSync`,
    description,
    openGraph: {
      title: `${title} | TVSync`,
      description,
      url: `/tv/${listType}`,
    },
  };
};

const resultsFromPages = <Item,>(
  pages: Array<{ results: Array<Item> | undefined } | undefined>
) => pages.flatMap((response) => response?.results ?? []);

// Keep the route segment thin while preserving the existing two-page hydration
// used to keep TV overview shelves full after quality filtering.
export const TVOverview = async () => {
  const [
    trending,
    trendingPageTwo,
    popular,
    popularPageTwo,
    topRated,
    topRatedPageTwo,
    ...genreResponses
  ] = await Promise.all([
    getTrendingTVShowsServer({ page: 1 }, 'week'),
    getTrendingTVShowsServer({ page: 2 }, 'week'),
    getDiscoverTVShowsServer({
      page: 1,
      ...popularTVShowDiscoverParams,
    }),
    getDiscoverTVShowsServer({
      page: 2,
      ...popularTVShowDiscoverParams,
    }),
    getDiscoverTVShowsServer({
      page: 1,
      ...highestRatedTVShowDiscoverParams,
    }),
    getDiscoverTVShowsServer({
      page: 2,
      ...highestRatedTVShowDiscoverParams,
    }),
    ...tvGenreSections.flatMap((section) =>
      [1, 2].map((pageNumber) =>
        getDiscoverTVShowsServer({
          page: pageNumber,
          ...tvGenreParams(section),
        })
      )
    ),
  ]);

  return (
    <MediaOverviewPage
      mediaType={MediaType.Tv}
      searchPlaceholder="Search for TV Shows"
      sections={[
        {
          items: takeTVShowItems(
            resultsFromPages([trending, trendingPageTwo]),
            trendingTVShowQuality
          ),
          seeAllHref: buildTVShowHref('trending_week', {
            'vote_average.gte': trendingTVShowQuality.minVoteAverage,
            'vote_count.gte': trendingTVShowQuality.minVoteCount,
          }),
          title: 'Trending TV Shows This Week',
        },
        {
          items: takeTVShowItems(
            resultsFromPages([popular, popularPageTwo]),
            qualityFilterFromParams(popularTVShowDiscoverParams)
          ),
          seeAllHref: buildTVShowHref('popular', popularTVShowDiscoverParams),
          title: 'Most Popular TV Shows',
        },
        {
          items: takeTVShowItems(
            resultsFromPages([topRated, topRatedPageTwo]),
            qualityFilterFromParams(highestRatedTVShowDiscoverParams)
          ),
          seeAllHref: buildTVShowHref(
            'top_rated',
            highestRatedTVShowDiscoverParams
          ),
          title: 'Highest Rated TV Shows of All Time',
        },
        ...tvGenreSections.map((section, index) => {
          const params = tvGenreParams(section);

          return {
            items: takeTVShowItems(
              resultsFromPages([
                genreResponses[index * 2],
                genreResponses[index * 2 + 1],
              ]),
              qualityFilterFromParams(params)
            ),
            seeAllHref: tvGenreHref(section),
            title: section.title,
          };
        }),
      ]}
      subtitle="Browse weekly trends, popular picks, all-time favorites, and genre highlights from TMDB."
      title="TV Shows"
    />
  );
};
