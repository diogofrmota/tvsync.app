import { EmailChangeVerificationPage } from 'lib/pages/auth';
import { sendEmailChangedNotice } from 'lib/services/auth/email.server';
import { consumeEmailChangeToken } from 'lib/services/database/profile.server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Confirm your new TvSync email address.',
  title: 'TvSync | Confirm Email Change',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  let changed = false;

  try {
    const result = await consumeEmailChangeToken(token);
    changed = Boolean(result);

    if (result && result.previous_email !== result.email) {
      try {
        await sendEmailChangedNotice({
          email: result.previous_email,
          newEmail: result.email,
        });
      } catch {
        // The verified database change remains authoritative if notice delivery fails.
      }
    }
  } catch {
    changed = false;
  }

  return <EmailChangeVerificationPage changed={changed} />;
}
