import { ResetPasswordAuthPage } from 'lib/pages/auth';
import { isPasswordResetTokenValid } from 'lib/services/database/auth.server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Create a new password for your TvSync account.',
  title: 'TvSync | Create a New Password',
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: ResetPasswordPageProps) {
  const { token = '' } = await searchParams;
  let tokenValid = false;

  if (token) {
    try {
      tokenValid = await isPasswordResetTokenValid(token);
    } catch {
      tokenValid = false;
    }
  }

  return <ResetPasswordAuthPage token={token} tokenValid={tokenValid} />;
}
