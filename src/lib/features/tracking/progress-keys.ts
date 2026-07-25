/**
 * Shared SWR key for one show's overall progress. The show page renders the
 * summary and the season/episode controls side by side, so both sides address
 * the same cache entry: marking an episode revalidates the summary in place.
 */
export const getTvProgressSummaryKey = (tmdbShowId: number) =>
  ['tv-progress-summary', tmdbShowId] as const;
