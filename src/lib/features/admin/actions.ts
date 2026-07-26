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
  banAdminUser,
  type DiscoveryListSettingInput,
  findAdminUser,
  recordAdminAudit,
  refreshAllDiscoveryLists,
  refreshDiscoveryList,
  revalidateAdminOverviewStats,
  saveDiscoveryListSettings,
  unbanAdminUser,
} from 'lib/services/database/admin.server';
import { purgeExpiredAuthRecords } from 'lib/services/database/auth.server';
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
