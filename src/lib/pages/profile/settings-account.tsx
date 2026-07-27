import { Box } from '@chakra-ui/react';
import type { AuthMethods } from 'lib/services/database/profile.server';

import { ChangePasswordForm, DeleteAccountDialog } from './profile-form';
import { SettingsSection, SettingsSubPage } from './settings';

export const SettingsAccountPage = ({
  authMethods,
  username,
}: {
  authMethods: AuthMethods;
  username: string;
}) => (
  <SettingsSubPage
    subtitle="Sign-in security and account removal."
    title="Account"
  >
    <SettingsSection
      description={
        authMethods.hasCredentials
          ? 'Confirm your current password before setting a new one.'
          : 'Create a password for this Google-linked account without removing Google sign-in.'
      }
      title="Change Password"
    >
      <ChangePasswordForm hasCredentials={authMethods.hasCredentials} />
    </SettingsSection>

    <SettingsSection
      description="Deletion removes your account and related personal data permanently."
      title="Delete Account"
    >
      <Box alignSelf="flex-start">
        <DeleteAccountDialog
          hasCredentials={authMethods.hasCredentials}
          username={username}
        />
      </Box>
    </SettingsSection>
  </SettingsSubPage>
);
