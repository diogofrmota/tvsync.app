/**
 * Age certifications are the one rating TMDB publishes for every title, so they
 * are what the detail pages show alongside the TMDB score. They come from
 * `/tv/{id}/content_ratings` for shows and `/movie/{id}/release_dates` for
 * movies, and both endpoints return one entry per country.
 */
export type MediaCertification = {
  /** The certificate itself, e.g. "TV-MA" or "PG-13". */
  certification: string;
  /** ISO 3166-1 region the certificate was issued in, e.g. "US". */
  region: string;
};

/**
 * TvSync is an English-language product, so the English-speaking boards are
 * checked first; any other region is still shown (labelled with its country)
 * rather than dropping the certificate entirely.
 */
const PREFERRED_REGIONS = ['US', 'GB', 'CA', 'AU', 'IE', 'NZ'];

export const selectPreferredCertification = (
  candidates: Array<MediaCertification>
): MediaCertification | null => {
  const available = candidates.filter(
    (candidate) => candidate.certification.length > 0
  );

  for (const region of PREFERRED_REGIONS) {
    const match = available.find((candidate) => candidate.region === region);

    if (match) {
      return match;
    }
  }

  // Ordering by region keeps the fallback stable between requests instead of
  // following TMDB's arbitrary country order.
  return (
    available.toSorted((left, right) =>
      left.region.localeCompare(right.region)
    )[0] ?? null
  );
};
