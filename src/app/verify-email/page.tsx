import { VerifyEmailAuthPage } from 'lib/pages/auth';
import { consumeEmailVerificationToken } from 'lib/services/database/auth.server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Verify your TvSync email address.',
  title: 'Verify Email | TvSync',
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: VerifyEmailPageProps) {
  const { token = '' } = await searchParams;
  let verified = false;

  if (token) {
    try {
      verified = await consumeEmailVerificationToken(token);
    } catch {
      verified = false;
    }
  }

  return <VerifyEmailAuthPage verified={verified} />;
}
