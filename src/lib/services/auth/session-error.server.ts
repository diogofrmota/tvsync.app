import 'server-only';

export type AuthSessionIssue = {
  description: string;
  title: string;
};

export const getProfileAccessIssue = (
  error: unknown
): AuthSessionIssue | null => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (message.includes('unauthorized')) {
    return {
      description:
        'Your login session exists, but TVSync could not authorize private profile data for the current user. Sign out, clear TVSync cookies if needed, and sign in again.',
      title: 'Profile access could not be authorized',
    };
  }

  if (message.includes('forbidden')) {
    return {
      description:
        'TVSync refused the profile request because the session user did not match the private profile owner. Sign out and back in before trying again.',
      title: 'Profile access was forbidden',
    };
  }

  return null;
};

export const getAuthSessionIssue = (error: unknown): AuthSessionIssue => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  if (message.includes('secret')) {
    return {
      description:
        'The app could not read the login session. Confirm AUTH_SECRET is configured in Vercel production and redeploy so every auth request uses the same secret.',
      title: 'Auth session secret is not configured',
    };
  }

  if (
    message.includes('jwt') ||
    message.includes('jwe') ||
    message.includes('decrypt') ||
    message.includes('signature') ||
    message.includes('token')
  ) {
    return {
      description:
        'The login cookie could not be decoded. This usually happens after AUTH_SECRET changes or when old cookies were created with a different secret. Sign out, clear TVSync cookies, and sign in again after Vercel has the correct AUTH_SECRET.',
      title: 'Auth session cookie could not be decoded',
    };
  }

  return {
    description:
      'The app could not read the NextAuth session. Check Vercel runtime logs for the auth error and confirm AUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET are configured for production.',
    title: 'Auth session could not be read',
  };
};
