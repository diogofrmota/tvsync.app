'use server';

import {
  DISCOVERY_LIST_ITEM_LIMIT,
  DISCOVERY_LIST_REFRESH_HOURS,
  isDiscoveryRailKey,
} from 'lib/pages/media/discovery-rails';
import {
  endAdminSession,
  getAdminRequestDigest,
  requireAdminSession,
  startAdminSession,
  verifyAdminCredentials,
} from 'lib/services/admin/session.server';
import { checkRequestAuthRateLimit } from 'lib/services/auth/rate-limit.server';
import {
  type AdminUserRecord,
  addAdminCuratedListItem,
  banAdminUser,
  createAdminCuratedList,
  type DiscoveryListSettingInput,
  deleteAdminCuratedList,
  findAdminUser,
  recordAdminAudit,
  refreshAllDiscoveryLists,
  refreshDiscoveryList,
  removeAdminCuratedListItem,
  revalidateAdminOverviewStats,
  saveDiscoveryListSettings,
  unbanAdminUser,
} from 'lib/services/database/admin.server';
import { purgeExpiredAuthRecords } from 'lib/services/database/auth.server';
import {
  deleteAccountForPrivacyRequest,
  exportPersonalDataForPrivacyRequest,
  findAccountForPrivacyRequest,
} from 'lib/services/database/privacy.server';
import { getMovieListServer } from 'lib/services/tmdb/movie/list/index.server';
import { getTVShowSearchResultList } from 'lib/services/tmdb/tv/list/index.server';
import { MediaType, type TrackableMediaType } from 'lib/types';
import { redirect } from 'next/navigation';

export type AdminLoginState = {
  error?: string;
};

export type AdminActionState = {
  error?: string;
  success?: string;
};

const SESSION_EXPIRED_MESSAGE =
  'Your admin session is no longer valid. Sign in again to continue.';

const readTextField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === 'string' ? value.trim() : '';
};

const normalizeIdentifier = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase().slice(0, 254);

/**
 * Every mutation re-verifies the cookie before touching data. A rendered
 * dashboard is never treated as proof of authorization, so a tab left open past
 * the session lifetime — or past a password rotation — can no longer act.
 */
const authorizeAdmin = async () => {
  try {
    const [session, ipDigest] = await Promise.all([
      requireAdminSession(),
      getAdminRequestDigest(),
    ]);

    return { ipDigest, session };
  } catch {
    return null;
  }
};

const audit = (input: {
  action: string;
  actor: string;
  details?: string;
  ipDigest: string;
  target?: string;
}) => recordAdminAudit(input);

export const signInToAdmin = async (
  _previousState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> => {
  const user = readTextField(formData, 'user').slice(0, 254);
  const password = readTextField(formData, 'password').slice(0, 200);

  if (!(user && password)) {
    return { error: 'Enter the admin username and password.' };
  }

  // The dashboard has a single credential pair, so a brute-force attempt is
  // throttled by identity and by source before the comparison runs.
  const withinLimit = await checkRequestAuthRateLimit('adminLogin', user).catch(
    () => true
  );

  if (!withinLimit) {
    return { error: 'Too many attempts. Try again later.' };
  }

  if (!verifyAdminCredentials({ password, user })) {
    return { error: 'Invalid admin credentials.' };
  }

  const started = await startAdminSession(user);

  if (!started) {
    return {
      error:
        'The admin session could not be created. AUTH_SECRET must be configured.',
    };
  }

  await audit({
    action: 'admin.sign_in',
    actor: user,
    ipDigest: await getAdminRequestDigest(),
  });

  redirect('/admin');
};

export const signOutOfAdmin = async () => {
  const authorized = await authorizeAdmin();

  await endAdminSession();

  if (authorized) {
    await audit({
      action: 'admin.sign_out',
      actor: authorized.session.user,
      ipDigest: authorized.ipDigest,
    });
  }

  redirect('/admin');
};

export type AdminLookupState = AdminActionState & {
  user?: AdminUserRecord | null;
};

export const lookupUserAccount = async (
  _previousState: AdminLookupState,
  formData: FormData
): Promise<AdminLookupState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const identifier = normalizeIdentifier(readTextField(formData, 'identifier'));

  if (!identifier) {
    return { error: 'Enter an email address or username to look up.' };
  }

  const { data, error } = await findAdminUser(identifier);

  if (error) {
    return { error };
  }

  return data
    ? { user: data }
    : { error: `No account matches "${identifier}".`, user: null };
};

export const banUserAccount = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const identifier = normalizeIdentifier(readTextField(formData, 'identifier'));
  const reason = readTextField(formData, 'reason').slice(0, 300);

  if (!identifier) {
    return { error: 'Enter the email address or username to ban.' };
  }

  const { data, error } = await banAdminUser({ identifier, reason });

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: `No account matches "${identifier}".` };
  }

  await audit({
    action: 'user.ban',
    actor: authorized.session.user,
    details: reason,
    ipDigest: authorized.ipDigest,
    target: data.username,
  });
  revalidateAdminOverviewStats();

  return {
    success: `@${data.username} is banned. Their existing sessions were revoked.`,
  };
};

export const unbanUserAccount = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const identifier = normalizeIdentifier(readTextField(formData, 'identifier'));

  if (!identifier) {
    return { error: 'Enter the email address or username to unban.' };
  }

  const { data, error } = await unbanAdminUser(identifier);

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: `No banned account matches "${identifier}".` };
  }

  await audit({
    action: 'user.unban',
    actor: authorized.session.user,
    ipDigest: authorized.ipDigest,
    target: data.username,
  });
  revalidateAdminOverviewStats();

  return { success: `@${data.username} can sign in again.` };
};

const clamp = (value: number, bounds: { max: number; min: number }) =>
  Math.min(bounds.max, Math.max(bounds.min, Math.trunc(value) || bounds.min));

/**
 * The table is submitted as one payload so a reorder is saved atomically.
 * Unknown keys are dropped and every number is clamped here as well as by the
 * database constraints, because this input arrives from a browser.
 */
const parseListSettings = (
  value: string
): Array<DiscoveryListSettingInput> | null => {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.flatMap((entry, index) => {
      if (!(entry && typeof entry === 'object')) {
        return [];
      }

      const candidate = entry as Record<string, unknown>;
      const key = String(candidate.key ?? '');

      if (!isDiscoveryRailKey(key)) {
        return [];
      }

      return [
        {
          active: candidate.active === true,
          itemLimit: clamp(
            Number(candidate.itemLimit),
            DISCOVERY_LIST_ITEM_LIMIT
          ),
          key,
          position: Number.isFinite(Number(candidate.position))
            ? Math.max(0, Math.trunc(Number(candidate.position)))
            : index,
          refreshIntervalHours: clamp(
            Number(candidate.refreshIntervalHours),
            DISCOVERY_LIST_REFRESH_HOURS
          ),
          showOnExplore: candidate.showOnExplore === true,
          showOnHome: candidate.showOnHome === true,
        },
      ];
    });
  } catch {
    return null;
  }
};

export const saveDiscoveryLists = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const settings = parseListSettings(readTextField(formData, 'settings'));

  if (!settings?.length) {
    return { error: 'The list configuration could not be read.' };
  }

  const { error } = await saveDiscoveryListSettings(settings);

  if (error) {
    return { error };
  }

  await audit({
    action: 'lists.save',
    actor: authorized.session.user,
    details: `${settings.filter((setting) => setting.active).length} of ${settings.length} lists active`,
    ipDigest: authorized.ipDigest,
  });

  return { success: 'Home and Explore now use the saved list configuration.' };
};

export const refreshDiscoveryListNow = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const key = readTextField(formData, 'key');

  if (key === 'all') {
    const { data, error } = await refreshAllDiscoveryLists();

    if (error) {
      return { error };
    }

    await audit({
      action: 'lists.refresh_all',
      actor: authorized.session.user,
      ipDigest: authorized.ipDigest,
    });

    return {
      success: `${data ?? 0} lists will be refetched from TMDB on their next view.`,
    };
  }

  if (!isDiscoveryRailKey(key)) {
    return { error: 'Unknown list.' };
  }

  const { error } = await refreshDiscoveryList(key);

  if (error) {
    return { error };
  }

  await audit({
    action: 'lists.refresh',
    actor: authorized.session.user,
    ipDigest: authorized.ipDigest,
    target: key,
  });

  return { success: `${key} will be refetched from TMDB on its next view.` };
};

export const runAdminMaintenance = async (
  _previousState: AdminActionState
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  try {
    const purged = await purgeExpiredAuthRecords();
    const total =
      purged.emailChangeTokens +
      purged.passwordResetTokens +
      purged.rateLimits +
      purged.verificationTokens;

    await audit({
      action: 'maintenance.purge',
      actor: authorized.session.user,
      details: `${total} expired rows removed`,
      ipDigest: authorized.ipDigest,
    });

    return { success: `Removed ${total} expired authentication rows.` };
  } catch {
    return { error: 'The cleanup could not be completed.' };
  }
};

export const refreshAdminStats = async (
  _previousState: AdminActionState
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  revalidateAdminOverviewStats();

  return { success: 'Statistics recalculated.' };
};

const CURATED_LIST_SEARCH_LIMIT = 12;

export type AdminCuratedSearchResult = {
  mediaType: TrackableMediaType;
  posterPath: string | null;
  releaseYear: string;
  title: string;
  tmdbId: number;
};

export type AdminCuratedSearchState = AdminActionState & {
  listId?: string;
  query?: string;
  results?: Array<AdminCuratedSearchResult>;
};

const releaseYear = (value: string) => {
  const year = value ? new Date(value).getUTCFullYear() : Number.NaN;

  return Number.isFinite(year) ? String(year) : '';
};

/**
 * The dashboard's "search for a title" box. TMDB is only ever reached from the
 * server, so the key stays server-side and the browser receives the trimmed
 * shape the panel renders.
 */
export const searchCuratedListCandidates = async (
  _previousState: AdminCuratedSearchState,
  formData: FormData
): Promise<AdminCuratedSearchState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const listId = readTextField(formData, 'listId');
  const query = readTextField(formData, 'query').slice(0, 120);

  if (!query) {
    return { error: 'Enter a title to search for.', listId };
  }

  try {
    // A failing half of the search degrades to the other one rather than to an
    // empty result, exactly as the public search does.
    const [movies, tvShows] = await Promise.all([
      getMovieListServer({ section: 'popular', params: { page: 1, query } })
        .then((response) => response.results)
        .catch(() => []),
      getTVShowSearchResultList({ page: 1, query })
        .then((response) => response.results)
        .catch(() => []),
    ]);
    const results: Array<AdminCuratedSearchResult> = [
      ...movies.map((movie) => ({
        mediaType: MediaType.Movie as TrackableMediaType,
        popularity: movie.popularity,
        posterPath: movie.poster_path,
        releaseYear: releaseYear(movie.release_date),
        title: movie.title,
        tmdbId: movie.id,
      })),
      ...tvShows.map((show) => ({
        mediaType: MediaType.Tv as TrackableMediaType,
        popularity: show.popularity,
        posterPath: show.poster_path,
        releaseYear: releaseYear(show.first_air_date),
        title: show.name,
        tmdbId: show.id,
      })),
    ]
      .toSorted((first, second) => second.popularity - first.popularity)
      .slice(0, CURATED_LIST_SEARCH_LIMIT)
      .map(({ popularity: _popularity, ...result }) => result);

    return results.length
      ? { listId, query, results }
      : { error: `Nothing on TMDB matches "${query}".`, listId, query };
  } catch {
    return { error: 'The TMDB search could not be completed.', listId, query };
  }
};

export const createCuratedList = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const name = readTextField(formData, 'name').slice(0, 80);
  const description = readTextField(formData, 'description').slice(0, 280);

  if (!name) {
    return { error: 'Name the list before creating it.' };
  }

  const { data, error } = await createAdminCuratedList({ description, name });

  if (error) {
    return {
      error: error.includes('admin_curated_lists_name_unique')
        ? `A list called "${name}" already exists.`
        : error,
    };
  }

  if (!data) {
    return { error: 'The list could not be created.' };
  }

  await audit({
    action: 'curated_list.create',
    actor: authorized.session.user,
    ipDigest: authorized.ipDigest,
    target: data.name,
  });

  return { success: `"${data.name}" was created.` };
};

export const deleteCuratedList = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const listId = readTextField(formData, 'listId');

  if (!listId) {
    return { error: 'Choose the list to delete.' };
  }

  const { data, error } = await deleteAdminCuratedList(listId);

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: 'That list no longer exists.' };
  }

  await audit({
    action: 'curated_list.delete',
    actor: authorized.session.user,
    ipDigest: authorized.ipDigest,
    target: data.name,
  });

  return { success: `"${data.name}" and its titles were deleted.` };
};

const readCuratedItem = (
  formData: FormData
): {
  listId: string;
  mediaType: TrackableMediaType;
  tmdbId: number;
} | null => {
  const listId = readTextField(formData, 'listId');
  const tmdbId = Number(readTextField(formData, 'tmdbId'));
  const mediaType = readTextField(formData, 'mediaType');

  if (!(listId && Number.isInteger(tmdbId) && tmdbId > 0)) {
    return null;
  }

  if (mediaType === MediaType.Movie || mediaType === MediaType.Tv) {
    return { listId, mediaType, tmdbId };
  }

  return null;
};

export const addTitleToCuratedList = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const item = readCuratedItem(formData);

  if (!item) {
    return { error: 'That title could not be read.' };
  }

  const title = readTextField(formData, 'title').slice(0, 200);
  const { data, error } = await addAdminCuratedListItem({
    ...item,
    posterPath: readTextField(formData, 'posterPath') || null,
    title,
  });

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: 'That list no longer exists.' };
  }

  await audit({
    action: 'curated_list.add_item',
    actor: authorized.session.user,
    details: `${item.mediaType} ${item.tmdbId}`,
    ipDigest: authorized.ipDigest,
    target: data.listName,
  });

  return data.added
    ? { success: `${title || 'The title'} was added to "${data.listName}".` }
    : { success: `${title || 'That title'} is already on "${data.listName}".` };
};

export const removeTitleFromCuratedList = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const item = readCuratedItem(formData);

  if (!item) {
    return { error: 'That title could not be read.' };
  }

  const { data, error } = await removeAdminCuratedListItem(item);

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: 'That title is no longer on the list.' };
  }

  await audit({
    action: 'curated_list.remove_item',
    actor: authorized.session.user,
    details: `${item.mediaType} ${item.tmdbId}`,
    ipDigest: authorized.ipDigest,
  });

  return { success: 'The title was removed from the list.' };
};

export type AdminDataRequestState = AdminActionState & {
  filename?: string;
  json?: string;
};

/**
 * Answers a GDPR Art. 15 / CCPA "right to know" request that arrived out of
 * band, for a user who cannot reach Edit Profile themselves. The export is the
 * same data the account can download for itself, and the request is audited by
 * the username it named — never by the exported contents.
 */
export const exportUserDataForRequest = async (
  _previousState: AdminDataRequestState,
  formData: FormData
): Promise<AdminDataRequestState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const identifier = normalizeIdentifier(readTextField(formData, 'identifier'));

  if (!identifier) {
    return { error: 'Enter the email address or username to export.' };
  }

  try {
    const account = await findAccountForPrivacyRequest(identifier);

    if (!account) {
      return { error: `No account matches "${identifier}".` };
    }

    const data = await exportPersonalDataForPrivacyRequest(account.userId);

    await audit({
      action: 'privacy.export',
      actor: authorized.session.user,
      details: 'Data access request fulfilled',
      ipDigest: authorized.ipDigest,
      target: account.username,
    });

    return {
      filename: `tvsync-data-${account.username}-${new Date().toISOString().slice(0, 10)}.json`,
      json: JSON.stringify(data, null, 2),
      success: `Export ready for @${account.username}.`,
    };
  } catch {
    return { error: 'The export could not be produced.' };
  }
};

/**
 * Erasure (GDPR Art. 17 / CCPA "right to delete") for the same out-of-band
 * case. The username has to be typed back exactly, because this is the one
 * admin action nothing can undo.
 */
export const eraseUserAccountForRequest = async (
  _previousState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> => {
  const authorized = await authorizeAdmin();

  if (!authorized) {
    return { error: SESSION_EXPIRED_MESSAGE };
  }

  const identifier = normalizeIdentifier(readTextField(formData, 'identifier'));
  const confirmation = normalizeIdentifier(
    readTextField(formData, 'confirmation')
  );

  if (!identifier) {
    return { error: 'Enter the email address or username to erase.' };
  }

  try {
    const account = await findAccountForPrivacyRequest(identifier);

    if (!account) {
      return { error: `No account matches "${identifier}".` };
    }

    if (confirmation !== account.username.toLowerCase()) {
      return {
        error: `Type ${account.username} in the confirmation field to erase this account.`,
      };
    }

    const erased = await deleteAccountForPrivacyRequest(account.userId);

    if (!erased) {
      return { error: 'The account was already erased.' };
    }

    await audit({
      action: 'privacy.erase',
      actor: authorized.session.user,
      details: 'Erasure request fulfilled',
      ipDigest: authorized.ipDigest,
      target: erased.username,
    });
    revalidateAdminOverviewStats();

    return {
      success: `@${erased.username} and all personal data linked to that account were erased.`,
    };
  } catch {
    return { error: 'The account could not be erased.' };
  }
};
