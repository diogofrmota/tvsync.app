import { AuthPage } from 'lib/pages/auth';
import { getSafeCallbackUrl } from 'lib/services/auth/callback-url';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  title: 'Register | TVSync',
  description:
    'Create a TVSync account with Google to save watchlists and track movies and TV shows.',
  openGraph: {
    title: 'Register | TVSync',
    description:
      'Create a TVSync account with Google to save watchlists and track movies and TV shows.',
    url: '/register',
  },
};

type RegisterPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

export default async function Page({ searchParams }: RegisterPageProps) {
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
      mode="register"
    />
  );
}
