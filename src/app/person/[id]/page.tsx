import { PersonDetailPage } from 'lib/pages/person/detail';
import { parsePositiveIntegerRouteParam } from 'lib/utils/route-params';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const personId = parsePositiveIntegerRouteParam(id);

  if (personId === null) {
    notFound();
  }

  return <PersonDetailPage personId={personId} />;
}
