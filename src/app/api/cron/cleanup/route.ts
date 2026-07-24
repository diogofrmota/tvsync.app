import { purgeExpiredAuthRecords } from 'lib/services/database/auth.server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' } as const;

// Scheduled by vercel.json `crons`. Vercel sends `Authorization: Bearer
// $CRON_SECRET` on cron invocations; requiring it keeps the endpoint from being
// triggered by the public. Without a configured secret the route refuses to run
// rather than exposing an open cleanup trigger.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { headers: noStore, status: 401 }
    );
  }

  try {
    const purged = await purgeExpiredAuthRecords();

    return NextResponse.json({ ok: true, purged }, { headers: noStore });
  } catch (error) {
    console.error('Auth cleanup cron failed:', error);

    return NextResponse.json(
      { error: 'Cleanup failed.', ok: false },
      { headers: noStore, status: 500 }
    );
  }
}
