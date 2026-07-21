'use server';

import { authOptions } from 'lib/services/auth/index.server';
import { getAuthSessionIssue } from 'lib/services/auth/session-error.server';
import { getDatabaseAvailabilityIssue } from 'lib/services/database/core.server';
import {
  getOwnProfile,
  isUsernameTakenByAnotherUser,
  upsertOwnProfile,
} from 'lib/services/database/tracking.server';
import { PrivacySetting } from 'lib/types';
import { revalidatePath } from 'next/cache';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      'bio' | 'displayName' | 'name' | 'privacySetting' | 'username',
      string
    >
  >;
  success?: string;
};

const usernamePattern = /^[a-z0-9_]{3,24}$/;

const readTextField = (formData: FormData, fieldName: string) => {
  const value = formData.get(fieldName);

  return typeof value === 'string' ? value.trim() : '';
};

const isPrivacySetting = (value: string): value is PrivacySetting =>
  Object.values(PrivacySetting).includes(value as PrivacySetting);

const normalizeUsername = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '_');

export const updateOwnProfile = async (
  _previousState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> => {
  let session: Session | null = null;

  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    const issue = getAuthSessionIssue(error);

    return {
      error: `${issue.title}: ${issue.description}`,
    };
  }

  if (!session?.user?.id) {
    return {
      error: 'Sign in again before updating your profile.',
    };
  }

  const name = readTextField(formData, 'name');
  const displayName = readTextField(formData, 'displayName');
  const username = normalizeUsername(readTextField(formData, 'username'));
  const bio = readTextField(formData, 'bio');
  const privacySetting = readTextField(formData, 'privacySetting');
  const fieldErrors: ProfileFormState['fieldErrors'] = {};

  if (name.length < 1) {
    fieldErrors.name = 'Name is required.';
  }

  if (displayName.length < 1) {
    fieldErrors.displayName = 'Display name is required.';
  }

  if (!usernamePattern.test(username)) {
    fieldErrors.username =
      'Use 3-24 lowercase letters, numbers, or underscores.';
  }

  if (bio.length > 280) {
    fieldErrors.bio = 'Bio must be 280 characters or fewer.';
  }

  if (!isPrivacySetting(privacySetting)) {
    fieldErrors.privacySetting = 'Choose a valid privacy setting.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const validatedPrivacySetting = privacySetting as PrivacySetting;

  try {
    if (await isUsernameTakenByAnotherUser(username)) {
      return {
        fieldErrors: {
          username: 'That username is already taken.',
        },
      };
    }

    const existingProfile = await getOwnProfile();
    const email = session.user.email ?? existingProfile?.email ?? '';

    if (!email) {
      return {
        error: 'Your Google account email is required before saving a profile.',
      };
    }

    await upsertOwnProfile({
      bio,
      displayName,
      email,
      name,
      privacySetting: validatedPrivacySetting,
      username,
    });
  } catch (error) {
    const databaseIssue = getDatabaseAvailabilityIssue(error);

    if (databaseIssue) {
      return {
        error: `${databaseIssue.title}: ${databaseIssue.description}`,
      };
    }

    if (String(error).includes('profiles_email_lower_unique')) {
      return {
        error:
          'This Google email is already linked to another TVSync profile row. The Neon profile data needs to be reconciled before this profile can be saved.',
      };
    }

    if (String(error).includes('profiles_username_lower_unique')) {
      return {
        fieldErrors: {
          username: 'That username is already taken.',
        },
      };
    }

    return {
      error: 'Profile updates could not be saved. Please try again.',
    };
  }

  revalidatePath('/profile');

  return {
    success: 'Profile saved.',
  };
};
