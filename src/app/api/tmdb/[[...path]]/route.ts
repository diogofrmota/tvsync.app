import { tmdbServerFetcherCore } from 'lib/services/tmdb/utils.server';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const allowedProxyParamNames = new Set([
  'first_air_date_year',
  'include_adult',
  'include_image_language',
  'language',
  'page',
  'primary_release_year',
  'query',
  'region',
  'sort_by',
  'vote_average.gte',
  'vote_count.gte',
  'with_genres',
  'year',
]);

const blockedProxyParamNames = new Set([
  'access_token',
  'api_key',
  'guest_session_id',
  'request_token',
  'session_id',
]);
const positiveIntegerPathSegmentRegex = /^[1-9]\d*$/;
const movieListSections = new Set([
  'now_playing',
  'popular',
  'top_rated',
  'upcoming',
]);
const movieNestedResources = new Set(['images', 'recommendations']);
const tvListSections = new Set([
  'airing_today',
  'on_the_air',
  'popular',
  'top_rated',
]);
const searchResources = new Set(['movie', 'tv']);
const trendingResources = new Set(['movie', 'tv']);
const trendingTimeWindows = new Set(['day', 'week']);

const isPositiveIntegerPathSegment = (segment?: string) =>
  Boolean(
    segment &&
      positiveIntegerPathSegmentRegex.test(segment) &&
      Number.isSafeInteger(Number(segment))
  );

type ProxyPathValidator = (
  idOrSection?: string,
  nestedResource?: string
) => boolean;

const proxyPathValidators: Record<string, ProxyPathValidator> = {
  discover: (idOrSection, nestedResource) =>
    (idOrSection === 'movie' || idOrSection === 'tv') && !nestedResource,
  genre: (idOrSection, nestedResource) =>
    (idOrSection === 'movie' || idOrSection === 'tv') &&
    nestedResource === 'list',
  movie: (idOrSection, nestedResource) => {
    if (movieListSections.has(idOrSection ?? '')) {
      return !nestedResource;
    }

    return (
      isPositiveIntegerPathSegment(idOrSection) &&
      movieNestedResources.has(nestedResource ?? '')
    );
  },
  person: (idOrSection, nestedResource) =>
    isPositiveIntegerPathSegment(idOrSection) && !nestedResource,
  search: (idOrSection, nestedResource) =>
    searchResources.has(idOrSection ?? '') && !nestedResource,
  trending: (idOrSection, nestedResource) =>
    trendingResources.has(idOrSection ?? '') &&
    trendingTimeWindows.has(nestedResource ?? ''),
  tv: (idOrSection, nestedResource) =>
    tvListSections.has(idOrSection ?? '') && !nestedResource,
};

const isAllowedTmdbProxyPath = (path: Array<string>) => {
  const [resource, idOrSection, nestedResource, extraResource] = path;

  if (extraResource || !resource) {
    return false;
  }

  return proxyPathValidators[resource]?.(idOrSection, nestedResource) ?? false;
};

const getAllowedQueryParams = (searchParams: URLSearchParams) => {
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    if (blockedProxyParamNames.has(key) || !allowedProxyParamNames.has(key)) {
      return;
    }

    params[key] = value;
  });

  return params;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: Array<string> }> }
) {
  const { path } = (await params) || [];
  const pathSegments = path ?? [];

  if (!isAllowedTmdbProxyPath(pathSegments)) {
    return NextResponse.json(
      { error: 'Unsupported TMDB proxy endpoint.' },
      { status: 404 }
    );
  }

  const queryParams = getAllowedQueryParams(request.nextUrl.searchParams);

  const requestPath = `/${pathSegments.join('/')}`;

  const data = await tmdbServerFetcherCore({
    path: requestPath,
    params: queryParams,
    reqInit: { cache: 'no-store' },
  });

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vercel-CDN-Cache-Control':
        'public, s-maxage=86400, stale-while-revalidate=600',
    },
  });
}
