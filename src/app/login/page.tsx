import { LoginAuthPage } from 'lib/pages/auth';
import { getSafeCallbackUrl } from 'lib/services/auth/callback-url';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Log in | TvSync',
  description:
    'Log in to TvSync with email, username, or Google authentication.',
  openGraph: {
    title: 'Log in | TvSync',
    description:
      'Log in to TvSync with email, username, or Google authentication.',
    url: '/login',
  },
};

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    account?: string;
    error?: string;
    reset?: string;
  }>;
};

const getAccountSuccessMessage = (account?: string) => {
  if (account === 'deleted') {
    return 'Your account and related personal data were permanently deleted.';
  }

  if (account === 'email-updated') {
    return 'Email updated. Sign in with your updated account.';
  }

  if (account === 'password-updated') {
    return 'Password updated. Sign in again to continue.';
  }

  return undefined;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);
  const { account, callbackUrl, error, reset } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (session?.user) {
    redirect(safeCallbackUrl as Route);
  }

  return (
    <LoginAuthPage
      callbackUrl={safeCallbackUrl}
      error={error}
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      )}
      passwordReset={reset === 'success'}
      successMessage={getAccountSuccessMessage(account)}
    />
  );
}
