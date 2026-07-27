import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { ContactForm } from 'lib/pages/contact/contact-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'TvSync | Report a Bug' };

export default function ReportABugPage() {
  return (
    <PageShell size="narrow">
      <PageHeading
        subtitle="Tell us what happened, what you expected, and how we can reproduce it."
        title="Report a Bug"
      />
      <ContactForm defaultSubject="Bug report" />
    </PageShell>
  );
}
