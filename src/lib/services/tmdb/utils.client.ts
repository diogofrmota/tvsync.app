import { fetcher } from 'lib/utils/fetcher';
import useSWR from 'swr';

const tmdbFetcher = <ResType>([path, params]: [
  path: string,
  // biome-ignore lint/suspicious/noExplicitAny: -
  params?: any,
]) => fetcher<ResType>(`/api/tmdb${path}`, params);

type UseTmdbSWRArgs<ResType> = {
  path: string;
  // biome-ignore lint/suspicious/noExplicitAny: -
  params?: any;
  fallbackData?: ResType;
  isReady?: boolean;
  transform?: (data: ResType) => ResType;
};

// biome-ignore lint/suspicious/noExplicitAny: -
export const useTmdbSWR = <ResType, ErrorType = any>({
  path,
  params,
  fallbackData,
  isReady = true,
  transform,
}: UseTmdbSWRArgs<ResType>) => {
  const {
    data: rawData,
    error,
    isLoading,
    mutate,
  } = useSWR<ResType, ErrorType>(isReady ? [path, params] : null, tmdbFetcher, {
    fallbackData,
  });
  const data = rawData && transform ? transform(rawData) : rawData;

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
};
