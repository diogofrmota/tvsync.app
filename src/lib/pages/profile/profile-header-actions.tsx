'use client';

import { Button } from '@chakra-ui/react';
import Link from 'next/link';
import { FiSettings, FiShare2 } from 'react-icons/fi';

export const ProfileHeaderActions = () => {
  const shareProfile = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: 'My TvSync profile', url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      <Button
        aria-label="Share profile"
        onClick={shareProfile}
        size="sm"
        variant="solid"
      >
        <FiShare2 />
        Share
      </Button>
      <Button aria-label="Profile settings" asChild size="sm" variant="solid">
        <Link href="/profile/settings">
          <FiSettings />
          Settings
        </Link>
      </Button>
    </>
  );
};
