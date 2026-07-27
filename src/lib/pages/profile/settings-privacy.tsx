import { Text } from '@chakra-ui/react';

import { DownloadPersonalDataButton } from './privacy-form';
import { SettingsSection, SettingsSubPage } from './settings';

export const SettingsPrivacyPage = () => (
  <SettingsSubPage
    subtitle="What TvSync does with your data, and how to take it with you."
    title="Privacy"
  >
    <SettingsSection
      description="TvSync never sells personal data and shows no third-party advertising."
      title="Privacy Choices"
    >
      <Text color="fg.muted" fontSize="sm">
        Download everything TvSync stores about your account as a JSON file.
      </Text>
      <DownloadPersonalDataButton />
    </SettingsSection>
  </SettingsSubPage>
);
