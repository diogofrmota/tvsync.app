import { IconButton } from '@chakra-ui/react';
import Link from 'next/link';
import { FiSettings } from 'react-icons/fi';

export const ProfileHeaderActions = () => (
  <IconButton aria-label="Profile settings" asChild size="sm" variant="solid">
    <Link href="/profile/settings">
      <FiSettings />
    </Link>
  </IconButton>
);
