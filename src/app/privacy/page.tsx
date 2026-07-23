import { LegalPage, LegalSection } from 'lib/pages/legal';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'TvSync | Privacy Policy' };
export default function PrivacyPage() {
  return (
    <LegalPage
      subtitle="How TvSync collects, uses, and protects your information."
      title="Privacy Policy"
    >
      <LegalSection title="Information we collect">
        When you create an account, TvSync stores the profile details you or
        your sign-in provider supply: name, username, display name, email
        address, an optional biography, and your chosen profile visibility
        setting. If you register with a password, TvSync stores only a
        bcrypt-hashed version of it, never the plaintext password. If you sign
        in with Google, Google supplies your name, email address, and a stable
        account identifier; TvSync does not receive or store your Google
        password. TvSync also stores the activity you create while using the
        product: your watchlist and library entries, watch status and episode
        progress, favourites, personal ratings, reviews and comments, and follow
        relationships with other users. Profile avatars are generated from your
        initials and display data; TvSync does not accept or store uploaded
        profile images. If you use the Contact form, TvSync processes the name,
        email address, subject, and message you submit in order to deliver it
        and reply to you.
      </LegalSection>
      <LegalSection title="How we use your information">
        TvSync uses this information to operate your account: authenticating
        sign-in, keeping your tracked shows and movies, calculating your
        personal statistics, displaying the public profile content you choose to
        make visible, and responding to messages sent through the Contact page.
        TvSync does not sell personal data and does not use your data for
        third-party advertising.
      </LegalSection>
      <LegalSection title="How authentication data is protected">
        Passwords for email/password accounts are hashed with bcrypt before
        storage; TvSync never stores or logs a plaintext password. Email
        verification and password-reset links use single-use tokens that are
        stored only as a one-way digest, expire after 24 hours, and are
        invalidated once used. Signing in with a new password or resetting your
        password invalidates your other active sessions. Google sign-in requires
        a Google-verified email address, and TvSync links your account using
        Google's stable account identifier rather than storing a password for
        that sign-in method. Access to your private tracking data is authorized
        on the server for every request based on your signed-in session; other
        users cannot read or change it.
      </LegalSection>
      <LegalSection title="External services that process data">
        TvSync relies on a small set of external providers to operate: Auth.js
        together with Google OAuth for sign-in, Neon (Postgres) for storing
        account and tracking data, Resend for delivering verification,
        password-reset, and Contact-form email, TMDB for movie and TV show
        information (TvSync's server relays only the media queries you make;
        TMDB does not receive your account credentials or profile data), and
        Vercel for application hosting. If NEXT_PUBLIC_UMAMI_WEBSITE_ID and
        NEXT_PUBLIC_UMAMI_SRC are configured for a deployment, TvSync also loads
        the Umami analytics script, which records anonymized usage events such
        as page views; no analytics script loads unless both values are
        configured.
      </LegalSection>
      <LegalSection title="Cookies">
        TvSync sets an essential session cookie so you can stay signed in; this
        cookie is required for the product to work and is not used for
        advertising. TvSync does not set marketing or cross-site tracking
        cookies. If a deployment enables Umami analytics as described above,
        that script may use its own client-side identifiers under its own
        configuration, separate from TvSync's session cookie.
      </LegalSection>
      <LegalSection title="Requesting your data">
        You can review and update your profile information at any time from Edit
        Profile. To request a copy of the personal data TvSync holds about your
        account, use the Contact page; TvSync will respond using the email
        address on your account.
      </LegalSection>
      <LegalSection title="Deleting your data">
        You can permanently delete your account from Edit Profile after typing
        your username to confirm (and your password, for password-based
        accounts). Confirmed deletion removes your profile and the personal data
        linked to it, including library activity, episode progress, favourites,
        ratings, reviews and comments, authentication provider links,
        verification/reset tokens, and social relationships. Limited operational
        records, such as security and rate-limit logs or routine provider
        backups, may persist briefly after deletion under Neon's, Resend's, and
        Vercel's own operational retention practices before they age out; TvSync
        does not keep these as an active account or use them to restore your
        profile. You can also request deletion through the Contact page if you
        cannot access your account.
      </LegalSection>
      <LegalSection title="Contact">
        Questions about this Privacy Policy or your data can be sent through the{' '}
        <Link href="/contact" style={{ textDecoration: 'underline' }}>
          Contact page
        </Link>
        .
      </LegalSection>
      <LegalSection title="Legal review">
        This page describes TvSync's actual data handling as implemented in the
        product today. It does not state a specific legal basis for processing
        (for example under GDPR or CCPA), a data retention schedule, or a
        registered business entity and jurisdiction, because none of these has
        been confirmed by the site owner. These items require owner or legal
        review before TvSync relies on this page for formal compliance purposes.
      </LegalSection>
    </LegalPage>
  );
}
