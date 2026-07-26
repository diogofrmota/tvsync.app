/**
 * The dashboard's pure formatters. They live apart from `panels.tsx` because
 * that module is a client component: keeping the number and date shaping in a
 * plain module lets the contract tests assert on it without pulling the Chakra
 * runtime into a test process.
 */

/** Dates render in a fixed UTC format so the server and client agree exactly. */
export const formatAdminDate = (value: string | null) => {
  if (!value) {
    return '—';
  }

  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
};

export const formatAdminNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

/**
 * States a 30-day figure against the 30 days before it. A period with no
 * previous activity has no percentage to report — dividing by zero would print
 * an infinite increase — so it is named as the start of the series instead.
 */
export const formatAdminChange = (current: number, previous: number) => {
  if (previous <= 0) {
    return current > 0 ? 'No previous 30 days to compare' : 'No change';
  }

  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.round(percent * 10) / 10;

  if (rounded === 0) {
    return `No change vs previous 30 days (${formatAdminNumber(previous)})`;
  }

  return `${rounded > 0 ? '+' : ''}${rounded}% vs previous 30 days (${formatAdminNumber(previous)})`;
};
