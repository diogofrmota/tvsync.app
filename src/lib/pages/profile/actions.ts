'use server';

import { sendEmailChangeVerification } from 'lib/services/auth/email.server';
import { hashPassword } from 'lib/services/auth/password.server';
import { checkRequestAuthRateLimit } from 'lib/services/auth/rate-limit.server';
import {
  isRecentAuthentication,
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from 'lib/services/auth/security';
import { getAuthSession } from 'lib/services/auth/session.server';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import {
  type AuthMethods,
  createOwnEmailChangeToken,
  deleteOwnAccount,
  getOwnAuthMethods,
  ProfileEmailConflictError,
  setOwnPassword,
  updateOwnProfileDetails,
  verifyOwnCurrentPassword,
} from 'lib/services/database/profile.server';
import {
  getOwnProfile,
  isUsernameTakenByAnotherUser,
} from 'lib/services/database/tracking.server';
import { PrivacySetting } from 'lib/types';

export type ProfileFormState = {
  emailPending?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<
      | 'bio'
      | 'currentPassword'
      | 'displayName'
      | 'email'
      | 'privacySetting'
      | 'username',
      string
    >
  >;
  success?: string;
};

export type PasswordFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<'confirmPassword' | 'currentPassword' | 'password', string>
  >;
  sessionInvalidated?: boolean;
  success?: string;
};

export type DeleteAccountFormState = {
  deleted?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'confirmation' | 'currentPassword', string>>;
};

const readTextField = (formData: FormData, fieldName: string) => {
  const value = formData.get(fieldName);

  return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
};

const readPasswordField = (formData: FormData, fieldName: string) => {
  const value = formData.get(fieldName);

  return typeof value === 'string' ? value : '';
};

const getAuthenticatedSession = async () => {
  const session = await getAuthSession();

  return session?.user?.id ? session : null;
};

const getSensitiveActionError = (hasCredentials: boolean) =>
  hasCredentials
    ? 'Enter your current password to confirm this account change.'
    : 'Sign in with Google again, then return here to confirm this account change.';

type ValidProfileInput = {
  bio: string;
  currentPassword: string;
  displayName: string;
  email: string;
  privacySetting: PrivacySetting;
  username: string;
};

const validateProfileInput = (
  formData: FormData
):
  | { fieldErrors: NonNullable<ProfileFormState['fieldErrors']> }
  | ValidProfileInput => {
  const input: ValidProfileInput = {
    bio: readTextField(formData, 'bio'),
    currentPassword: readPasswordField(formData, 'currentPassword'),
    displayName: readTextField(formData, 'displayName'),
    email: normalizeEmail(readTextField(formData, 'email')),
    privacySetting: readTextField(formData, 'privacySetting') as PrivacySetting,
    username: normalizeUsername(readTextField(formData, 'username')),
  };
  const fieldErrors: NonNullable<ProfileFormState['fieldErrors']> = {};
  const usernameError = validateUsername(input.username);
  const emailError = validateEmail(input.email);

  if (!input.displayName || input.displayName.length > 80) {
    fieldErrors.displayName = 'Use 1-80 characters for your display name.';
  }

  if (usernameError) {
    fieldErrors.username = usernameError;
  }

  if (emailError) {
    fieldErrors.email = emailError;
  }

  if (input.bio.length > 280) {
    fieldErrors.bio = 'Biography must be 280 characters or fewer.';
  }

  if (!Object.values(PrivacySetting).includes(input.privacySetting)) {
    fieldErrors.privacySetting = 'Choose a valid profile visibility.';
  }

  return Object.keys(fieldErrors).length > 0 ? { fieldErrors } : input;
};

const getReauthenticationFailure = (
  authMethods: AuthMethods
): ProfileFormState => ({
  fieldErrors: authMethods.hasCredentials
    ? { currentPassword: getSensitiveActionError(true) }
    : undefined,
  error: authMethods.hasCredentials
    ? undefined
    : getSensitiveActionError(false),
});

const hasSensitiveAuthorization = async (input: {
  authenticatedAt: number;
  authMethods: AuthMethods;
  currentPassword: string;
}) =>
  input.authMethods.hasCredentials
    ? verifyOwnCurrentPassword(input.currentPassword)
    : isRecentAuthentication(input.authenticatedAt);

const mapProfileUpdateError = (error: unknown): ProfileFormState => {
  const databaseIssue = getDatabaseAvailabilityIssue(error);

  if (databaseIssue) {
    return { error: `${databaseIssue.title}: ${databaseIssue.description}` };
  }

  if (error instanceof ProfileEmailConflictError) {
    return { fieldErrors: { email: error.message } };
  }

  const message = String(error);

  if (message.includes('profiles_username')) {
    return { fieldErrors: { username: 'That username is already taken.' } };
  }

  if (message.includes('profiles_email')) {
    return {
      fieldErrors: { email: 'That email address is already registered.' },
    };
  }

  return { error: 'Profile updates could not be saved. Please try again.' };
};

export const updateOwnProfile = async (
  _previousState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> => {
  const session = await getAuthenticatedSession();

  if (!session?.user) {
    return { error: 'Sign in again before updating your profile.' };
  }

  const input = validateProfileInput(formData);

  if ('fieldErrors' in input) {
    return input;
  }

  try {
    const [existingProfile, authMethods] = await Promise.all([
      getOwnProfile(),
      getOwnAuthMethods(),
    ]);

    if (!existingProfile) {
      return { error: 'Your profile could not be found.' };
    }

    const emailChanged = normalizeEmail(existingProfile.email) !== input.email;

    if (emailChanged) {
      const reauthenticated = await hasSensitiveAuthorization({
        authenticatedAt: session.user.authenticatedAt,
        authMethods,
        currentPassword: input.currentPassword,
      });

      if (!reauthenticated) {
        return getReauthenticationFailure(authMethods);
      }

      const withinLimit = await checkRequestAuthRateLimit(
        'emailChange',
        session.user.id
      );

      if (!withinLimit) {
        return { error: 'Too many email changes. Try again later.' };
      }
    }

    if (await isUsernameTakenByAnotherUser(input.username)) {
      return { fieldErrors: { username: 'That username is already taken.' } };
    }

    await updateOwnProfileDetails(input);

    if (emailChanged) {
      const recipient = await createOwnEmailChangeToken(input.email);

      if (recipient) {
        try {
          await sendEmailChangeVerification(recipient);
        } catch {
          return {
            emailPending: true,
            error:
              'Profile details were saved, but the verification email could not be delivered. Submit the email change again to retry.',
            success: 'Profile saved.',
          };
        }
      }

      return {
        emailPending: true,
        success:
          'Profile saved. Check the new email address to confirm the change; your current email remains active until then.',
      };
    }

    return { success: 'Profile saved.' };
  } catch (error) {
    return mapProfileUpdateError(error);
  }
};

export const changeOwnPassword = async (
  _previousState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> => {
  const session = await getAuthenticatedSession();

  if (!session?.user) {
    return { error: 'Sign in again before changing your password.' };
  }

  const currentPassword = readPasswordField(formData, 'currentPassword');
  const password = readPasswordField(formData, 'password');
  const confirmPassword = readPasswordField(formData, 'confirmPassword');
  const fieldErrors: NonNullable<PasswordFormState['fieldErrors']> = {};
  const passwordError = validatePassword(password);

  if (passwordError) {
    fieldErrors.password = passwordError;
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const authMethods = await getOwnAuthMethods();
    const reauthenticated = authMethods.hasCredentials
      ? await verifyOwnCurrentPassword(currentPassword)
      : isRecentAuthentication(session.user.authenticatedAt);

    if (!reauthenticated) {
      return {
        fieldErrors: authMethods.hasCredentials
          ? { currentPassword: getSensitiveActionError(true) }
          : undefined,
        error: authMethods.hasCredentials
          ? undefined
          : getSensitiveActionError(false),
      };
    }

    if (!(await checkRequestAuthRateLimit('passwordChange', session.user.id))) {
      return { error: 'Too many password changes. Try again later.' };
    }

    await setOwnPassword(await hashPassword(password));

    return {
      sessionInvalidated: true,
      success: authMethods.hasCredentials
        ? 'Password changed. Sign in again with your new password.'
        : 'Password created. You can now sign in with Google or your email and password. Sign in again to continue.',
    };
  } catch {
    return { error: 'Your password could not be updated. Please try again.' };
  }
};

export const permanentlyDeleteOwnAccount = async (
  _previousState: DeleteAccountFormState,
  formData: FormData
): Promise<DeleteAccountFormState> => {
  const session = await getAuthenticatedSession();

  if (!session?.user) {
    return { error: 'Sign in again before deleting your account.' };
  }

  const confirmation = readTextField(formData, 'confirmation');
  const currentPassword = readPasswordField(formData, 'currentPassword');

  try {
    const [profile, authMethods] = await Promise.all([
      getOwnProfile(),
      getOwnAuthMethods(),
    ]);

    if (!profile) {
      return { error: 'Your profile could not be found.' };
    }

    if (confirmation !== profile.username) {
      return {
        fieldErrors: {
          confirmation: `Type ${profile.username} exactly to confirm.`,
        },
      };
    }

    const reauthenticated = authMethods.hasCredentials
      ? await verifyOwnCurrentPassword(currentPassword)
      : isRecentAuthentication(session.user.authenticatedAt);

    if (!reauthenticated) {
      return {
        fieldErrors: authMethods.hasCredentials
          ? { currentPassword: getSensitiveActionError(true) }
          : undefined,
        error: authMethods.hasCredentials
          ? undefined
          : getSensitiveActionError(false),
      };
    }

    if (!(await checkRequestAuthRateLimit('accountDelete', session.user.id))) {
      return { error: 'Too many deletion attempts. Try again later.' };
    }

    const deleted = await deleteOwnAccount();

    return deleted
      ? { deleted: true }
      : { error: 'The account was already deleted.' };
  } catch {
    return { error: 'Your account could not be deleted. Please try again.' };
  }
};
