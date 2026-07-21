import type { TmdbAPIListResponse, TmdbImagePath } from './types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

export const normalizeText = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

export const normalizeImagePath = (value: unknown): TmdbImagePath =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const normalizeDate = (value: unknown) => normalizeText(value);

export const normalizeNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeNumberArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number')
    : [];

export const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

export const normalizeObjectArray = <Result>(
  value: unknown,
  normalizeItem: (item: UnknownRecord) => Result
) =>
  Array.isArray(value)
    ? value.filter(isRecord).map((item) => normalizeItem(item))
    : [];

export const normalizeListResponse = <Result>(
  response: Partial<TmdbAPIListResponse<unknown>> | undefined,
  normalizeItem: (item: UnknownRecord) => Result
): TmdbAPIListResponse<Result> => ({
  page: normalizeNumber(response?.page, 1),
  results: normalizeObjectArray(response?.results, normalizeItem),
  total_pages: normalizeNumber(response?.total_pages),
  total_results: normalizeNumber(response?.total_results),
});
