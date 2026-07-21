import 'server-only';

import {
  MediaOverviewPage,
  mapMovieOverviewItem,
  uniqueMediaOverviewItems,
} from 'lib/pages/media/overview';
import {
  buildMediaOverviewHref,
  type MediaQualityFilter,
  qualityFilterFromParams,
  takeMediaOverviewItems,
} from 'lib/pages/media/overview.server';
import {
  getMovieListServer,
  getTrendingMoviesServer,
} from 'lib/services/tmdb/movie/list/index.server';
import type {
  ListType,
  MovieListItemType,
  MovieListParams,
} from 'lib/services/tmdb/movie/list/types';
import { MediaType } from 'lib/types';
import type { Metadata } from 'next';

const sectionLabels: Record<string, string> = {
  now_playing: 'Now Playing Movies',
  popular: 'Popular Movies',
  top_rated: 'Top Rated Movies',
  trending_week: 'Trending Movies This Week',
  upcoming: 'Upcoming Movies',
};

const trendingMovieQuality = {
  minVoteAverage: 5.5,
  minVoteCount: 300,
} as const;

const popularMovieDiscoverParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6',
  'vote_count.gte': '1000',
} satisfies MovieListParams;

const highestRatedMovieDiscoverParams = {
  include_adult: 'false',
  sort_by: 'vote_average.desc',
  'vote_average.gte': '7',
  'vote_count.gte': '10000',
} satisfies MovieListParams;

const defaultGenreMovieDiscoverParams = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
  'vote_average.gte': '6.3',
  'vote_count.gte': '500',
} satisfies MovieListParams;

const movieGenreSections = [
  { genreId: 18, title: 'Best Drama Movies' },
  { genreId: 35, title: 'Best Comedy Movies' },
  { genreId: 28, title: 'Best Action Movies' },
  { genreId: 12, title: 'Best Adventure Movies' },
  { genreId: 9648, title: 'Best Mystery Movies' },
  { genreId: 80, title: 'Best Crime Movies' },
  {
    genreId: 99,
    params: {
      'vote_average.gte': '6.5',
      'vote_count.gte': '250',
    },
    title: 'Best Documentary Movies',
  },
] as const;

const buildMovieHref = (section: ListType, params: MovieListParams = {}) =>
  buildMediaOverviewHref({
    basePath: '/movies',
    listType: section,
    params,
  });

const movieGenreParams = (
  section: (typeof movieGenreSections)[number]
): MovieListParams => ({
  ...defaultGenreMovieDiscoverParams,
  ...('params' in section ? section.params : {}),
  with_genres: String(section.genreId),
});

const movieGenreHref = (section: (typeof movieGenreSections)[number]) =>
  buildMovieHref('popular', movieGenreParams(section));

const takeMovieItems = (
  movies: Array<MovieListItemType>,
  filter: MediaQualityFilter
) =>
  takeMediaOverviewItems(
    movies,
    filter,
    mapMovieOverviewItem,
    uniqueMediaOverviewItems
  );

export const getMovieSectionMetadata = (section: ListType): Metadata => {
  const title = sectionLabels[section] ?? 'Movies';
  const description = `Browse ${title.toLowerCase()} from TMDB on TVSync.`;

  return {
    title: `${title} | TVSync`,
    description,
    openGraph: {
      title: `${title} | TVSync`,
      description,
      url: `/movies/${section}`,
    },
  };
};

// Keep the route segment thin: this server component owns the movies overview
// composition and leaves the route file to choose overview vs paginated list.
export const MovieOverview = async () => {
  const [trending, popular, topRated, ...genreResponses] = await Promise.all([
    getTrendingMoviesServer({ page: 1 }, 'week'),
    getMovieListServer({
      section: 'popular',
      params: { page: 1, ...popularMovieDiscoverParams },
    }),
    getMovieListServer({
      section: 'top_rated',
      params: { page: 1, ...highestRatedMovieDiscoverParams },
    }),
    ...movieGenreSections.map((genreSection) =>
      getMovieListServer({
        section: 'popular',
        params: {
          page: 1,
          ...movieGenreParams(genreSection),
        },
      })
    ),
  ]);

  return (
    <MediaOverviewPage
      mediaType={MediaType.Movie}
      searchPlaceholder="Search for Movies"
      sections={[
        {
          items: takeMovieItems(trending.results, trendingMovieQuality),
          seeAllHref: buildMovieHref('trending_week', {
            'vote_average.gte': trendingMovieQuality.minVoteAverage,
            'vote_count.gte': trendingMovieQuality.minVoteCount,
          }),
          title: 'Trending Movies This Week',
        },
        {
          items: takeMovieItems(
            popular.results,
            qualityFilterFromParams(popularMovieDiscoverParams)
          ),
          seeAllHref: buildMovieHref('popular', popularMovieDiscoverParams),
          title: 'Most Popular Movies',
        },
        {
          items: takeMovieItems(
            topRated.results,
            qualityFilterFromParams(highestRatedMovieDiscoverParams)
          ),
          seeAllHref: buildMovieHref(
            'top_rated',
            highestRatedMovieDiscoverParams
          ),
          title: 'Highest Rated Movies of All Time',
        },
        ...movieGenreSections.map((genreSection, index) => {
          const params = movieGenreParams(genreSection);

          return {
            items: takeMovieItems(
              genreResponses[index]?.results ?? [],
              qualityFilterFromParams(params)
            ),
            seeAllHref: movieGenreHref(genreSection),
            title: genreSection.title,
          };
        }),
      ]}
      subtitle="Browse weekly trends, popular picks, all-time favorites, and genre highlights from TMDB."
      title="Movies"
    />
  );
};
