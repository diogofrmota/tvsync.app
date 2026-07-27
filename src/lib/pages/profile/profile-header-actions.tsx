import { Button, IconButton } from '@chakra-ui/react';
import Link from 'next/link';
import { FiEdit2, FiSettings } from 'react-icons/fi';

export const ProfileSettingsAction = () => (
  <IconButton
    aria-label="Profile settings"
    asChild
    background="blackAlpha.700"
    borderColor="whiteAlpha.400"
    borderWidth="1px"
    color="white"
    size="md"
    variant="subtle"
  >
    <Link href="/profile/settings">
      <FiSettings />
    </Link>
  </IconButton>
);

export const ProfileHeaderActions = () => (
  <Button asChild borderRadius="full" size="sm" variant="outline">
    <Link href="/profile/settings/profile">
      <FiEdit2 />
      Edit profile
    </Link>
  </Button>
);
