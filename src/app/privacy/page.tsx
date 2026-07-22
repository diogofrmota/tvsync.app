import { LegalPage, LegalSection } from 'lib/pages/legal';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy | TvSync' };
export default function PrivacyPage() {
  return (
    <LegalPage
      subtitle="How TvSync handles and protects your information."
      title="Privacy Policy"
    >
      <LegalSection title="Data we collect">
        We process account profile details and the movie and TV activity you
        choose to save. Google provides authentication details when you sign in.
      </LegalSection>
      <LegalSection title="How data is used">
        Your data provides account access, personal tracking, statistics, and
        public profile features you explicitly enable.
      </LegalSection>
      <LegalSection title="Services and security">
        Authentication is handled with Auth.js and Google, application data is
        stored with Neon, media information comes from TMDB, and hosting is
        provided by Vercel. Access to private data is checked on the server.
      </LegalSection>
      <LegalSection title="Cookies">
        TvSync uses essential session cookies needed to keep you signed in.
        Optional analytics only run when configured.
      </LegalSection>
      <LegalSection title="Your choices and contact">
        You can update your profile and permanently delete your account from
        Edit Profile. Confirmed deletion removes the profile and relational
        personal data stored for it, including library activity, episode
        progress, favourites, ratings, reviews, comments, authentication
        provider links, verification/reset tokens, and social relationships.
        Operational security logs and provider backups may remain for their
        limited legal, fraud-prevention, and disaster-recovery retention periods
        before automatic expiry; they are not kept as an active TvSync account.
        Use the Contact page for access or privacy questions.
      </LegalSection>
    </LegalPage>
  );
}
