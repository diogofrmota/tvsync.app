import { fetcher } from 'lib/utils/fetcher';

import { TMDB_API_KEY, TMDB_API_URL } from './constants';

const LEADING_SLASHES_REGEX = /^\/+/;
const TRAILING_SLASHES_REGEX = /\/+$/;
const BLOCKED_TMDB_PARAM_NAMES = new Set([
  'access_token',
  'api_key',
  'guest_session_id',
  'request_token',
  'session_id',
]);

const serializeTmdbParam = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return;
};

const getRequiredTmdbApiKey = () => {
  if (!TMDB_API_KEY) {
    throw new Error(
      'Missing TMDB_API_KEY. Add it to your local .env.local file and to Vercel environment variables.'
    );
  }

  return TMDB_API_KEY;
};

const buildTmdbUrl = (path: string, params?: object) => {
  const url = new URL(
    path.replace(LEADING_SLASHES_REGEX, ''),
    `${TMDB_API_URL.replace(TRAILING_SLASHES_REGEX, '')}/`
  );

  for (const [key, value] of Object.entries(params ?? {})) {
    if (BLOCKED_TMDB_PARAM_NAMES.has(key)) {
      continue;
    }

    const serializedValue = serializeTmdbParam(value);

    if (serializedValue !== undefined) {
      url.searchParams.set(key, serializedValue);
    }
  }

  url.searchParams.set('api_key', getRequiredTmdbApiKey());

  return url;
};

export const tmdbServerFetcherCore = async <ResType>({
  path,
  params,
  reqInit,
}: {
  path: string;
  params?: object;
  reqInit?: RequestInit;
}) => {
  const res = await fetch(buildTmdbUrl(path, params), reqInit);

  if (!res.ok) {
    throw new Error(
      `TMDB request failed: ${res.status} ${res.statusText} (${path})`
    );
  }

  return res.json() as ResType;
};

export const tmdbServerFetcher = <ResType, Params extends object = object>(
  path: string,
  params?: Params
) => fetcher<ResType>(buildTmdbUrl(path, params).toString());
