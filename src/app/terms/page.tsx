import { LegalPage, LegalSection } from 'lib/pages/legal';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service | TvSync' };
export default function TermsPage() {
  return (
    <LegalPage subtitle="The rules for using TvSync." title="Terms of Service">
      <LegalSection title="Account responsibilities">
        Keep your account access secure and provide accurate profile
        information. You are responsible for activity performed through your
        account.
      </LegalSection>
      <LegalSection title="Acceptable use">
        Do not misuse the service, attempt unauthorized access, interfere with
        other users, or submit unlawful or harmful content.
      </LegalSection>
      <LegalSection title="Content and availability">
        You retain ownership of content you submit. Movie and TV information
        belongs to its respective providers. TvSync may change, pause, or
        discontinue features.
      </LegalSection>
      <LegalSection title="Accounts">
        Accounts may be restricted or terminated when these terms are violated.
        You may permanently delete your account from Edit Profile after explicit
        confirmation. Deletion removes submitted reviews and comments rather
        than anonymising them, along with the rest of the account data described
        in the Privacy Policy.
      </LegalSection>
      <LegalSection title="Liability and changes">
        TvSync is provided without guarantees of uninterrupted availability.
        These terms may change as the service evolves; material changes will be
        reflected on this page.
      </LegalSection>
    </LegalPage>
  );
}
