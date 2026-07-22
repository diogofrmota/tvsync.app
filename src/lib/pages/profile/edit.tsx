import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import type { AuthMethods } from 'lib/services/database/profile.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import Link from 'next/link';

import {
  ChangePasswordForm,
  DeleteAccountDialog,
  ProfileForm,
} from './profile-form';

const EditSection = ({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) => (
  <Stack
    borderColor="border"
    borderRadius="lg"
    borderWidth="1px"
    gap={5}
    padding={{ base: 5, md: 6 }}
  >
    <Stack gap={1}>
      <Heading as="h2" fontSize="xl">
        {title}
      </Heading>
      <Text color="fg.muted" fontSize="sm">
        {description}
      </Text>
    </Stack>
    {children}
  </Stack>
);

export const EditProfilePage = ({
  authMethods,
  profile,
}: {
  authMethods: AuthMethods;
  profile: OwnProfile;
}) => (
  <PageShell size="narrow">
    <PageHeading
      actions={
        <Button asChild variant="outline">
          <Link href="/profile">Back to Profile</Link>
        </Button>
      }
      subtitle="Update your profile information and manage account security."
      title="Edit Profile"
    />

    <EditSection
      description="Changes to your display name, username, and biography are immediate. Email changes require verification."
      title="Profile Information"
    >
      <ProfileForm
        hasCredentials={authMethods.hasCredentials}
        initialValues={{
          bio: profile.bio,
          displayName: profile.display_name,
          email: profile.email,
          privacySetting: profile.privacy_setting,
          username: profile.username,
        }}
      />
    </EditSection>

    <EditSection
      description={
        authMethods.hasCredentials
          ? 'Confirm your current password before setting a new one.'
          : 'Create a password for this Google-linked account without removing Google sign-in.'
      }
      title="Change Password"
    >
      <ChangePasswordForm hasCredentials={authMethods.hasCredentials} />
    </EditSection>

    <EditSection
      description="Deletion removes your account and related personal data permanently."
      title="Delete Account"
    >
      <Box alignSelf="flex-start">
        <DeleteAccountDialog
          hasCredentials={authMethods.hasCredentials}
          username={profile.username}
        />
      </Box>
    </EditSection>
  </PageShell>
);
