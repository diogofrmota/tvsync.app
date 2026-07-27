import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import type { MediaCardEntry } from 'lib/components/shared/media-item';
import { PageHeading, PageShell } from 'lib/components/shared/PageShell';
import type { AuthMethods } from 'lib/services/database/profile.server';
import type { OwnProfile } from 'lib/services/database/tracking.server';
import Link from 'next/link';

import { DownloadPersonalDataButton } from './privacy-form';
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
  backdropOptions,
  profile,
}: {
  authMethods: AuthMethods;
  backdropOptions: Array<MediaCardEntry>;
  profile: OwnProfile;
}) => (
  <PageShell size="narrow">
    <PageHeading
      actions={
        <Button
          _hover={{ background: 'gray.100', color: 'gray.900' }}
          asChild
          background="white"
          color="gray.900"
          variant="outline"
        >
          <Link href="/profile">Back to Profile</Link>
        </Button>
      }
      subtitle="Update your profile information."
      title="Edit Profile"
    />

    <Box id="profile" scrollMarginTop="6rem">
      <EditSection
        description="Changes to your display name, username and bio are immediate. Email changes require verification."
        title="Profile Information"
      >
        <ProfileForm
          backdropOptions={backdropOptions}
          hasCredentials={authMethods.hasCredentials}
          initialValues={{
            bio: profile.bio,
            displayName: profile.display_name,
            email: profile.email,
            profileBackdropPath: profile.profile_backdrop_path,
            profileBackdropTitle: profile.profile_backdrop_title,
            username: profile.username,
          }}
        />
      </EditSection>
    </Box>

    <Box id="account" scrollMarginTop="6rem">
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
    </Box>

    <Box id="privacy" scrollMarginTop="6rem">
      <EditSection
        description="TvSync never sells personal data and shows no third-party advertising."
        title="Privacy Choices"
      >
        <Text color="fg.muted" fontSize="sm">
          Download everything TvSync stores about your account as a JSON file.
        </Text>
        <DownloadPersonalDataButton />
      </EditSection>
    </Box>
  </PageShell>
);
