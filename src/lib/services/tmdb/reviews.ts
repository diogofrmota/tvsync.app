import {
  normalizeDate,
  normalizeNumber,
  normalizeObjectArray,
  normalizeText,
} from 'lib/services/tmdb/normalize';

/**
 * A published TMDB review, shaped for display. TMDB reviews are long-form and
 * written by TMDB members, so the app shows the author, their optional score,
 * when it was written, and the text itself.
 */
export type MediaReview = {
  author: string;
  /** The author's own rating out of 10, when they left one. */
  authorRating: number | null;
  content: string;
  createdAt: string;
  id: string;
  /** Permalink to the full review on TMDB. */
  url: string | null;
};

export type MediaReviewsResponse = {
  id: number;
  page: number;
  results: Array<MediaReview>;
  total_pages: number;
  total_results: number;
};

const TMDB_REVIEW_URL = 'https://www.themoviedb.org/review/';

const normalizeAuthorRating = (details: unknown) => {
  const rating =
    typeof details === 'object' && details !== null
      ? (details as Record<string, unknown>).rating
      : null;

  return typeof rating === 'number' && Number.isFinite(rating) && rating > 0
    ? rating
    : null;
};

const normalizeAuthorName = (item: Record<string, unknown>) => {
  const details =
    typeof item.author_details === 'object' && item.author_details !== null
      ? (item.author_details as Record<string, unknown>)
      : {};

  return (
    normalizeText(item.author) ||
    normalizeText(details.name) ||
    normalizeText(details.username) ||
    'TMDB member'
  );
};

// Only TMDB's own review permalinks are trusted; anything else is dropped so a
// review can never link somewhere unexpected.
const normalizeReviewUrl = (item: Record<string, unknown>) => {
  const id = normalizeText(item.id);
  const url = normalizeText(item.url);

  if (url.startsWith(TMDB_REVIEW_URL)) {
    return url;
  }

  return id ? `${TMDB_REVIEW_URL}${id}` : null;
};

export const normalizeMediaReviewsResponse = (
  response: Partial<MediaReviewsResponse> | undefined
): MediaReviewsResponse => ({
  id: normalizeNumber(response?.id),
  page: normalizeNumber(response?.page, 1),
  results: normalizeObjectArray(response?.results, (item) => ({
    author: normalizeAuthorName(item),
    authorRating: normalizeAuthorRating(item.author_details),
    content: normalizeText(item.content).trim(),
    createdAt: normalizeDate(item.created_at),
    id: normalizeText(item.id),
    url: normalizeReviewUrl(item),
  })).filter((review) => review.id && review.content),
  total_pages: normalizeNumber(response?.total_pages),
  total_results: normalizeNumber(response?.total_results),
});
