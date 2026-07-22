import {
  normalizeImagePath,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

import type {
  MovieWatchProvider,
  MovieWatchProviderRegion,
  MovieWatchProvidersResponse,
} from './types';

const regionCodeRegex = /^[A-Z]{2}$/;

const normalizeTmdbWatchLink = (value: unknown) => {
  const link = normalizeText(value);

  try {
    const url = new URL(link);

    return url.protocol === 'https:' && url.hostname === 'www.themoviedb.org'
      ? url.toString()
      : '';
  } catch {
    return '';
  }
};

const normalizeProvider = (
  provider: Record<string, unknown>
): MovieWatchProvider => ({
  displayPriority: normalizeNumber(
    provider.display_priority ?? provider.displayPriority
  ),
  logoPath: normalizeImagePath(provider.logo_path ?? provider.logoPath),
  providerId: normalizeNumber(provider.provider_id ?? provider.providerId),
  providerName: normalizeText(provider.provider_name ?? provider.providerName),
});

const normalizeProviderList = (value: unknown) =>
  normalizeObjectArray(value, normalizeProvider)
    .filter(
      (provider) =>
        provider.providerId > 0 && provider.providerName.trim().length > 0
    )
    .toSorted((left, right) => left.displayPriority - right.displayPriority);

const normalizeRegion = (
  region: Record<string, unknown>
): MovieWatchProviderRegion => ({
  ads: normalizeProviderList(region.ads),
  buy: normalizeProviderList(region.buy),
  flatrate: normalizeProviderList(region.flatrate),
  free: normalizeProviderList(region.free),
  link: normalizeTmdbWatchLink(region.link),
  rent: normalizeProviderList(region.rent),
});

export const normalizeMovieWatchProvidersResponse = (
  response: Partial<MovieWatchProvidersResponse> | undefined
): MovieWatchProvidersResponse => {
  const results: MovieWatchProvidersResponse['results'] = {};

  for (const [region, value] of Object.entries(response?.results ?? {})) {
    if (regionCodeRegex.test(region) && value && typeof value === 'object') {
      results[region] = normalizeRegion(value as Record<string, unknown>);
    }
  }

  return { id: normalizeNumber(response?.id), results };
};

export const normalizeWatchRegion = (value?: string) => {
  const region = value?.trim().toUpperCase();

  return region && regionCodeRegex.test(region) ? region : 'US';
};
