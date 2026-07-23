import { LegalPage, LegalSection } from 'lib/pages/legal';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'TvSync | Terms of Service' };
export default function TermsPage() {
  return (
    <LegalPage subtitle="The rules for using TvSync." title="Terms of Service">
      <LegalSection title="Account responsibilities">
        You must provide accurate account information and keep your sign-in
        credentials secure. You are responsible for activity that occurs through
        your account, whether you sign in with a password or with Google. Tell
        TvSync promptly through the Contact page if you believe your account has
        been accessed without authorization.
      </LegalSection>
      <LegalSection title="Acceptable use">
        Do not misuse TvSync: do not attempt to gain unauthorized access to
        another account or to TvSync's systems, interfere with or disrupt the
        service, scrape or bulk-extract data outside normal use, or submit
        content that is unlawful, harassing, or infringes someone else's rights.
      </LegalSection>
      <LegalSection title="Content ownership">
        You retain ownership of the reviews, comments, ratings, and other
        content you submit to TvSync. By submitting content, you allow TvSync to
        store and display it as part of the product, including on public profile
        pages when your privacy setting allows it. Movie and TV show titles,
        artwork, and metadata displayed in TvSync belong to their respective
        rights holders and are supplied through TMDB; TvSync does not claim
        ownership of that data.
      </LegalSection>
      <LegalSection title="Service availability">
        TvSync is provided on an as-available basis without a guarantee of
        uninterrupted or error-free operation. Features that depend on external
        providers, such as TMDB media data, Google sign-in, or Resend email
        delivery, may be unavailable if those providers are unavailable. TvSync
        may add, change, or remove features as the product evolves.
      </LegalSection>
      <LegalSection title="Account suspension or termination">
        TvSync may restrict or terminate an account that violates these terms.
        You may permanently delete your own account at any time from Edit
        Profile after typing your username to confirm (and your password, for
        password-based accounts). Account deletion removes your submitted
        reviews and comments rather than keeping them under a different
        identity, along with the rest of the account data described in the
        Privacy Policy.
      </LegalSection>
      <LegalSection title="Limitation of liability">
        TvSync is offered without warranties of any kind, express or implied,
        including fitness for a particular purpose. To the fullest extent
        permitted by law, TvSync is not liable for indirect, incidental, or
        consequential damages arising from your use of the service, including
        data loss or unavailability caused by a third-party provider TvSync
        depends on.
      </LegalSection>
      <LegalSection title="Changes to these terms">
        These terms may change as TvSync evolves. Material changes will be
        reflected on this page; continuing to use TvSync after a change means
        you accept the updated terms.
      </LegalSection>
      <LegalSection title="Contact">
        Questions about these Terms of Service can be sent through the{' '}
        <Link href="/contact" style={{ textDecoration: 'underline' }}>
          Contact page
        </Link>
        .
      </LegalSection>
      <LegalSection title="Legal review">
        This page describes TvSync's actual account and content rules as
        implemented in the product today. It does not name a registered business
        entity, business address, or a governing law and jurisdiction for
        disputes, because none of these has been confirmed by the site owner.
        These items require owner or legal review before TvSync relies on this
        page for formal compliance purposes.
      </LegalSection>
    </LegalPage>
  );
}
