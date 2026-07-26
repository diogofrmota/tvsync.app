import { createServer } from 'node:http';

// A minimal stand-in for the TMDB API so the E2E suite can render movie/TV
// detail, season, and episode pages deterministically without a real
// TMDB_API_KEY or network access. Only the endpoints the app actually calls
// (see src/lib/services/tmdb/**/index.server.ts) are implemented; anything
// else 404s loudly so a missing route is obvious instead of silently
// returning an empty shape.

const PORT = Number(process.env.TMDB_MOCK_PORT ?? 4100);
const YOUTUBE_KEY = 'dQw4w9WgXcQ';
const numericSegmentPattern = /^\d+$/;

const genre = (id, name) => ({ id, name });

const movieItem = (id) => ({
  adult: false,
  backdrop_path: '/backdrop.jpg',
  genre_ids: [28, 12],
  id,
  original_language: 'en',
  original_title: `Mock Movie ${id}`,
  overview: `Overview for mock movie ${id}.`,
  popularity: 100 + id,
  poster_path: '/poster.jpg',
  release_date: '2024-01-01',
  title: `Mock Movie ${id}`,
  video: false,
  vote_average: 7.5,
  vote_count: 1000,
});

const tvItem = (id) => ({
  backdrop_path: '/backdrop.jpg',
  first_air_date: '2024-01-01',
  genre_ids: [18],
  id,
  name: `Mock TV Show ${id}`,
  origin_country: ['US'],
  original_language: 'en',
  original_name: `Mock TV Show ${id}`,
  overview: `Overview for mock TV show ${id}.`,
  popularity: 100 + id,
  poster_path: '/poster.jpg',
  vote_average: 8.1,
  vote_count: 500,
});

const movieListResponse = (count = 20) => ({
  dates: { maximum: '2024-12-31', minimum: '2024-01-01' },
  page: 1,
  results: Array.from({ length: count }, (_, index) => movieItem(index + 1)),
  total_pages: 1,
  total_results: count,
});

const tvListResponse = (count = 20) => ({
  page: 1,
  results: Array.from({ length: count }, (_, index) => tvItem(index + 1)),
  total_pages: 1,
  total_results: count,
});

const movieDetail = (id) => ({
  ...movieItem(id),
  belongs_to_collection: undefined,
  budget: 100_000_000,
  genres: [genre(28, 'Action'), genre(12, 'Adventure')],
  homepage: '',
  imdb_id: 'tt0000001',
  production_companies: [],
  production_countries: [],
  revenue: 500_000_000,
  runtime: 128,
  spoken_languages: [],
  status: 'Released',
  tagline: 'A mock tagline.',
});

const tvDetail = (id) => ({
  ...tvItem(id),
  created_by: [],
  episode_run_time: [45],
  genres: [genre(18, 'Drama')],
  homepage: '',
  in_production: false,
  languages: ['en'],
  last_air_date: '2024-06-01',
  last_episode_to_air: null,
  networks: [],
  next_episode_to_air: null,
  number_of_episodes: 10,
  number_of_seasons: 1,
  production_companies: [],
  production_countries: [],
  seasons: [
    {
      air_date: '2024-01-01',
      episode_count: 10,
      id: 9001,
      name: 'Season 1',
      overview: 'Mock season overview.',
      poster_path: '/season-poster.jpg',
      season_number: 1,
      vote_average: 8,
    },
  ],
  spoken_languages: [],
  status: 'Ended',
  tagline: 'A mock TV tagline.',
  type: 'Scripted',
});

const person = (id, name) => ({
  adult: false,
  credit_id: `credit-${id}`,
  gender: 2,
  id,
  known_for_department: 'Acting',
  name,
  original_name: name,
  popularity: 12.3,
  profile_path: null,
});

const creditsResponse = (id) => ({
  cast: [
    {
      ...person(id * 10 + 1, 'Mock Actor One'),
      character: 'Lead Role',
      order: 0,
    },
    {
      ...person(id * 10 + 2, 'Mock Actor Two'),
      character: 'Support Role',
      order: 1,
    },
  ],
  crew: [
    {
      ...person(id * 10 + 3, 'Mock Director'),
      department: 'Directing',
      job: 'Director',
    },
  ],
  id,
});

const videosResponse = (id) => ({
  id,
  results: [
    {
      id: 'video-1',
      key: YOUTUBE_KEY,
      name: 'Official Trailer',
      official: true,
      published_at: '2024-01-01T00:00:00.000Z',
      site: 'YouTube',
      type: 'Trailer',
    },
  ],
});

const reviewsResponse = (id) => ({
  id,
  page: 1,
  results: [
    {
      author: 'Mock Reviewer',
      author_details: {
        name: 'Mock Reviewer',
        rating: 8,
        username: 'mockreviewer',
      },
      content: 'A thoughtful mock review with enough content to render.',
      created_at: '2024-02-01T00:00:00.000Z',
      id: `review-${id}`,
      url: `https://www.themoviedb.org/review/review-${id}`,
    },
  ],
  total_pages: 1,
  total_results: 1,
});

const externalIdsResponse = (id) => ({ id, imdb_id: 'tt0000002' });

const seasonEpisode = (showId, seasonNumber, episodeNumber) => ({
  air_date: '2024-01-08',
  crew: [],
  episode_number: episodeNumber,
  episode_type: 'standard',
  guest_stars: [],
  id: showId * 1000 + seasonNumber * 100 + episodeNumber,
  name: `Episode ${episodeNumber}`,
  overview: `Overview for S${seasonNumber}E${episodeNumber}.`,
  production_code: '',
  runtime: 45,
  season_number: seasonNumber,
  show_id: showId,
  still_path: '/still.jpg',
  vote_average: 7.8,
  vote_count: 42,
});

const seasonDetail = (showId, seasonNumber) => ({
  _id: `season-${showId}-${seasonNumber}`,
  air_date: '2024-01-01',
  episodes: Array.from({ length: 10 }, (_, index) =>
    seasonEpisode(showId, seasonNumber, index + 1)
  ),
  id: showId * 100 + seasonNumber,
  name: `Season ${seasonNumber}`,
  overview: `Overview for season ${seasonNumber}.`,
  poster_path: '/season-poster.jpg',
  season_number: seasonNumber,
  vote_average: 8,
});

const genreListResponse = () => ({
  genres: [genre(28, 'Action'), genre(12, 'Adventure'), genre(18, 'Drama')],
});

const numeric = (segment) => numericSegmentPattern.test(segment ?? '');
// IDs at or above this are treated as "doesn't exist on TMDB" so tests can
// exercise the app's 404 path without a separate not-found fixture list.
const NOT_FOUND_ID_THRESHOLD = 900_000;
const isFindableId = (id) => id < NOT_FOUND_ID_THRESHOLD;

const respondJson = (res, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(payload),
    'Content-Type': 'application/json',
  });
  res.end(payload);
};

const respondNotFound = (res, path) => {
  const payload = JSON.stringify({
    status_message: `Mock TMDB server has no route for ${path}`,
    status_code: 34,
  });
  res.writeHead(404, {
    'Content-Length': Buffer.byteLength(payload),
    'Content-Type': 'application/json',
  });
  res.end(payload);
};

const MOVIE_LIST_SECTIONS = new Set([
  'now_playing',
  'popular',
  'top_rated',
  'upcoming',
]);
const TV_LIST_SECTIONS = new Set([
  'airing_today',
  'on_the_air',
  'popular',
  'top_rated',
]);

const handleMovie = (segments) => {
  const [, idOrSection, sub] = segments;

  if (MOVIE_LIST_SECTIONS.has(idOrSection)) {
    return movieListResponse();
  }

  if (!numeric(idOrSection)) {
    return null;
  }

  const id = Number(idOrSection);

  if (!isFindableId(id)) {
    return null;
  }

  if (!sub) {
    return movieDetail(id);
  }
  if (sub === 'credits') {
    return creditsResponse(id);
  }
  if (sub === 'videos') {
    return videosResponse(id);
  }
  if (sub === 'reviews') {
    return reviewsResponse(id);
  }
  if (sub === 'recommendations' || sub === 'similar') {
    return movieListResponse(5);
  }

  return null;
};

const handleTv = (segments) => {
  const [
    ,
    idOrSection,
    sub,
    seasonNumberSegment,
    episodeKeyword,
    episodeNumberSegment,
  ] = segments;

  if (TV_LIST_SECTIONS.has(idOrSection)) {
    return tvListResponse();
  }

  if (!numeric(idOrSection)) {
    return null;
  }

  const id = Number(idOrSection);

  if (!isFindableId(id)) {
    return null;
  }

  if (!sub) {
    return tvDetail(id);
  }
  if (sub === 'credits') {
    return creditsResponse(id);
  }
  if (sub === 'videos') {
    return videosResponse(id);
  }
  if (sub === 'external_ids') {
    return externalIdsResponse(id);
  }
  if (sub === 'reviews') {
    return reviewsResponse(id);
  }
  if (sub === 'similar') {
    return tvListResponse(5);
  }
  if (sub === 'season' && numeric(seasonNumberSegment)) {
    const seasonNumber = Number(seasonNumberSegment);

    if (!episodeKeyword) {
      return seasonDetail(id, seasonNumber);
    }
    if (episodeKeyword === 'episode' && numeric(episodeNumberSegment)) {
      return seasonEpisode(id, seasonNumber, Number(episodeNumberSegment));
    }
  }

  return null;
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const [resource] = segments;

  if (resource === 'movie') {
    const body = handleMovie(segments);
    return body ? respondJson(res, body) : respondNotFound(res, url.pathname);
  }

  if (resource === 'tv') {
    const body = handleTv(segments);
    return body ? respondJson(res, body) : respondNotFound(res, url.pathname);
  }

  if (resource === 'discover' && segments[1] === 'movie') {
    return respondJson(res, movieListResponse());
  }
  if (resource === 'discover' && segments[1] === 'tv') {
    return respondJson(res, tvListResponse());
  }
  if (resource === 'trending' && segments[1] === 'movie') {
    return respondJson(res, movieListResponse());
  }
  if (resource === 'trending' && segments[1] === 'tv') {
    return respondJson(res, tvListResponse());
  }
  if (resource === 'search' && segments[1] === 'movie') {
    return respondJson(res, movieListResponse());
  }
  if (resource === 'search' && segments[1] === 'tv') {
    return respondJson(res, tvListResponse());
  }
  if (resource === 'genre') {
    return respondJson(res, genreListResponse());
  }

  return respondNotFound(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`[tmdb-mock] listening on http://localhost:${PORT}`);
});
