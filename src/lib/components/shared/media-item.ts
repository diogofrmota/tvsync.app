/**
 * Poster-shaped media summary shared by every discovery surface: home rails,
 * explore rails, media overview shelves, and the full "See All" grids.
 */
export type MediaCardItem = {
  id: number;
  posterPath: string | null;
  title: string;
};
