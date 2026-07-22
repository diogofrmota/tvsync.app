import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import { ContactForm } from 'lib/pages/contact/contact-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact | TvSync' };
export default function ContactPage() {
  return (
    <PageShell size="narrow">
      <PageHeading
        subtitle="Ask a question or report a problem."
        title="Contact"
      />
      <ContactForm />
    </PageShell>
  );
}
