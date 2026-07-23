import { ForgotPasswordAuthPage } from 'lib/pages/auth';
import { authOptions } from 'lib/services/auth/index.server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export const metadata: Metadata = {
  description: 'Request a secure TvSync password reset email.',
  title: 'TvSync | Reset Password',
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/profile');
  }

  return <ForgotPasswordAuthPage />;
}
