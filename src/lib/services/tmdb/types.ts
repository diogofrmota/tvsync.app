export type TmdbAPIListResponse<ResultItemType> = {
  page: number;
  results: Array<ResultItemType>;
  total_results: number;
  total_pages: number;
};

export type TmdbListParams = {
  language?: string;
  page?: number;
};

export type TmdbImagePath = string | null;
export type TmdbDateString = string;

export type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbProductionCompany = {
  id: number;
  logo_path: TmdbImagePath;
  name: string;
  origin_country: string;
};

export type TmdbProductionCountry = {
  iso_3166_1: string;
  name: string;
};

export type TmdbSpokenLanguage = {
  english_name?: string;
  iso_639_1: string;
  name: string;
};

export type TmdbCreditsResponse<CastType, CrewType> = {
  id: number;
  cast: Array<CastType>;
  crew: Array<CrewType>;
};
