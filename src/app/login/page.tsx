import { AuthPage } from 'lib/pages/auth';
import { getSafeCallbackUrl } from 'lib/services/auth/callback-url';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Log in | TVSync',
  description:
    'Log in to TVSync with Google to manage your profile, watchlist, and tracking.',
  openGraph: {
    title: 'Log in | TVSync',
    description:
      'Log in to TVSync with Google to manage your profile, watchlist, and tracking.',
    url: '/login',
  },
};

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);
  const { callbackUrl, error } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (session?.user) {
    redirect(safeCallbackUrl as Route);
  }

  return (
    <AuthPage
      callbackUrl={safeCallbackUrl}
      error={error}
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      )}
      mode="login"
    />
  );
}
