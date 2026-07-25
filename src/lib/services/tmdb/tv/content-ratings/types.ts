export type TvContentRating = {
  iso_3166_1: string;
  rating: string;
};

export type TvContentRatingsResponse = {
  id: number;
  results: Array<TvContentRating>;
};
