import { Stack, Text } from '@chakra-ui/react';
import type { OwnProfile } from 'lib/services/database/tracking.server';

import { ProfileAvatarPicker } from './profile-avatar-picker';
import { ProfileForm } from './profile-form';
import { SettingsSection, SettingsSubPage } from './settings';

export const SettingsProfilePage = ({
  hasCredentials,
  profile,
}: {
  hasCredentials: boolean;
  profile: OwnProfile;
}) => (
  <SettingsSubPage subtitle="How you appear on TvSync." title="Profile">
    <SettingsSection
      description="Your avatar is the poster of any show or film you pick in search. Nothing is uploaded."
      title="Avatar"
    >
      <Stack align="center" gap={3}>
        <ProfileAvatarPicker
          avatarPath={profile.profile_avatar_path}
          avatarTitle={profile.profile_avatar_title}
          displayName={profile.display_name || profile.name || profile.username}
        />
        <Text color="fg.muted" fontSize="sm">
          {profile.profile_avatar_path
            ? `From ${profile.profile_avatar_title || 'a title you picked'}. Tap the avatar to change it.`
            : 'Tap the avatar to pick a show or film.'}
        </Text>
      </Stack>
    </SettingsSection>

    <SettingsSection
      description="Changes to your display name, username and bio are immediate. Email changes require verification."
      title="Profile Information"
    >
      <ProfileForm
        hasCredentials={hasCredentials}
        initialValues={{
          bio: profile.bio,
          displayName: profile.display_name,
          email: profile.email,
          username: profile.username,
        }}
      />
    </SettingsSection>
  </SettingsSubPage>
);
