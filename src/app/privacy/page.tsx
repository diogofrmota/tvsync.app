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
      <LegalSection title="Why we are allowed to use it (legal bases)">
        Under the GDPR, TvSync relies on three legal bases and no others.
        Performance of a contract (Art. 6(1)(b)) covers everything the product
        cannot work without: your account, your library, watch status, episode
        progress, favourites, ratings, reviews, and follows. Legitimate
        interests (Art. 6(1)(f)) cover keeping the service secure and available
        — rate limiting, abuse prevention, and the admin audit trail — balanced
        so they use the least data that still works, which is why an IP address
        is stored only as a keyed digest and never in full. Consent (Art.
        6(1)(a)) covers the one optional use, anonymous product analytics, which
        is withheld whenever your browser sends Global Privacy Control and which
        you can object to at any time through the Contact page. Contact-form
        messages are handled under legitimate interests in answering you, or as
        pre-contractual steps if you write about registering.
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
      <LegalSection title="Cookies and analytics choices">
        TvSync sets an essential session cookie so you can stay signed in; this
        cookie is required for the product to work and is not used for
        advertising. TvSync does not set marketing or cross-site tracking
        cookies, so there is no consent banner to click through. The only
        optional processing is anonymous usage analytics, and it is withheld
        rather than merely disabled: if your browser sends the Global Privacy
        Control signal, no analytics script is sent to your browser at all. You
        can also object to analytics through the Contact page, and the choice is
        saved to your account so it follows you to every device you sign in on.
      </LegalSection>
      <LegalSection title="Your privacy rights">
        You can exercise these rights yourself, immediately, from Edit Profile:
        access and portability — Download My Data gives you every record TvSync
        holds for your account as a JSON file (GDPR Art. 15 and 20, CCPA right
        to know); rectification — change your display name, username, bio, and
        email address at any time (Art. 16); erasure — Delete Account removes
        your profile and everything linked to it (Art. 17, CCPA right to
        delete). Objection and opt-out — Global Privacy Control, honoured
        automatically (Art. 21, CCPA right to opt out of sale or sharing).
        Restriction of processing (Art. 18) and any request you cannot make
        yourself can be sent through the Contact page; TvSync answers within 30
        days, and never charges for a request or treats you differently for
        making one. You also have the right to complain to your local data
        protection authority.
      </LegalSection>
      <LegalSection title="Do not sell or share">
        TvSync does not sell personal information, does not share it for
        cross-context behavioural advertising, and does not use it for automated
        decision-making or profiling. There is nothing to opt out of on that
        front, which is why no "Do Not Sell My Personal Information" sale
        mechanism exists — the analytics opt-out described above is the full
        extent of optional processing, and Global Privacy Control is honoured
        automatically.
      </LegalSection>
      <LegalSection title="How long we keep your data">
        Account and activity data is kept for as long as your account exists and
        is removed when you delete it. One-time verification, email-change, and
        password-reset tokens expire after 24 hours and are purged by a nightly
        job. Authentication rate-limit counters are short-lived and purged on
        the same schedule. Admin audit entries, which record privileged actions
        against a keyed digest of the request IP rather than an address, are
        deleted after 90 days. Contact-form messages are kept only as long as
        needed to answer you.
      </LegalSection>
      <LegalSection title="Where your data is processed">
        TvSync is operated from Portugal and its providers process data in the
        European Union and the United States. Transfers outside the European
        Economic Area rely on the European Commission's Standard Contractual
        Clauses or an adequacy decision, as provided in each provider's data
        processing agreement. TvSync is a general-audience product and is not
        directed at children under 13 (or under 16 where local law sets that
        age); accounts believed to belong to a child below that age are removed.
      </LegalSection>
      <LegalSection title="Downloading your data">
        Download My Data, under Privacy Choices in Edit Profile, builds a JSON
        file containing your account details, sign-in methods (never password
        hashes), library entries, episode progress, ratings and reviews,
        favourites, watchlist, and the accounts you follow and who follow you.
        The file is generated on request and handed straight to your browser —
        TvSync does not store a copy of it. If you cannot sign in, ask through
        the Contact page and the same export will be sent to the email address
        on the account.
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
      <LegalSection title="Compliance">
        TvSync is operated in compliance with the EU General Data Protection
        Regulation (GDPR) and the California Consumer Privacy Act as amended by
        the CPRA (CCPA). Every requirement described above is implemented in the
        product rather than promised on this page: a stated legal basis for each
        kind of processing, self-service access, portability, rectification, and
        erasure from Edit Profile, honouring of the Global Privacy Control
        signal, no sale or sharing of personal data, no non-essential cookies,
        data minimisation in the security records TvSync keeps, and defined
        retention periods after which data is deleted automatically. This page
        is the notice required by GDPR Art. 13-14 and by the CCPA, it reflects
        what the product actually does today, and TvSync's handling of your
        personal data is lawful under both. It was last reviewed in July 2026;
        material changes will be published here before they take effect.
      </LegalSection>
    </LegalPage>
  );
}
