import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { StatePanel } from 'lib/components/shared/Section';

export default function Loading() {
  return (
    <PageShell size="narrow">
      <PageHeading title="Followers" />
      <StatePanel message="Loading followers…" />
    </PageShell>
  );
}
