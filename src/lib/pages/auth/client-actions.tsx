'use client';

import { Button } from '@chakra-ui/react';
import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FiLogOut } from 'react-icons/fi';

export const OAuthButtons = ({
  callbackUrl,
  googleEnabled,
}: {
  callbackUrl: string;
  googleEnabled: boolean;
}) => {
  const [isPending, setIsPending] = useState(false);
  const handleGoogleSignIn = async () => {
    if (isPending) {
      return;
    }
    setIsPending(true);
    await signIn('google', { callbackUrl }).catch(() => setIsPending(false));
  };
  return (
    <Button
      disabled={!googleEnabled || isPending}
      loading={isPending}
      onClick={handleGoogleSignIn}
      size="lg"
      variant="outline"
    >
      <FcGoogle />
      Continue with Google
    </Button>
  );
};

export const LogoutButton = ({
  callbackUrl = '/',
}: {
  callbackUrl?: string;
}) => {
  const [isPending, setIsPending] = useState(false);
  const handleSignOut = async () => {
    if (isPending) {
      return;
    }
    setIsPending(true);
    await signOut({ callbackUrl }).catch(() => setIsPending(false));
  };
  return (
    <Button
      disabled={isPending}
      loading={isPending}
      onClick={handleSignOut}
      size="sm"
      variant="outline"
    >
      <FiLogOut />
      Log out
    </Button>
  );
};
