import { ForgotPasswordAuthPage } from 'lib/pages/auth';
import { getAuthSession } from 'lib/services/auth/session.server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  description: 'Request a secure TvSync password reset email.',
  title: 'TvSync | Reset Password',
};

export default async function Page() {
  const session = await getAuthSession();

  if (session?.user) {
    redirect('/profile');
  }

  return <ForgotPasswordAuthPage />;
}
