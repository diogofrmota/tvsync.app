import { AdminPage } from 'lib/pages/admin';
import type { Metadata } from 'next';

// The dashboard reads live counters and a session cookie, so it must never be
// prerendered, cached, or indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'TvSync | Admin',
  description: 'TvSync administration dashboard.',
  robots: { follow: false, index: false },
};

export default function Page() {
  return <AdminPage />;
}
