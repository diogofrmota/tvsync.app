'use client';

import { Button, VStack } from '@chakra-ui/react';
import { signIn, signOut } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { FiLogOut } from 'react-icons/fi';
import { SiApple } from 'react-icons/si';

type OAuthButtonsProps = {
  callbackUrl: string;
  googleEnabled: boolean;
};

export const OAuthButtons = ({
  callbackUrl,
  googleEnabled,
}: OAuthButtonsProps) => {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl }).catch(() => undefined);
  };

  return (
    <VStack align="stretch" gap={3}>
      <Button
        disabled={!googleEnabled}
        onClick={handleGoogleSignIn}
        size="lg"
        variant="solid"
      >
        <FcGoogle />
        Continue with Google
      </Button>
      <Button disabled size="lg" variant="outline">
        <SiApple />
        Apple coming later
      </Button>
    </VStack>
  );
};

type LogoutButtonProps = {
  callbackUrl?: string;
};

export const LogoutButton = ({ callbackUrl = '/' }: LogoutButtonProps) => {
  const handleSignOut = () => {
    signOut({ callbackUrl }).catch(() => undefined);
  };

  return (
    <Button onClick={handleSignOut} size="sm" variant="outline">
      <FiLogOut />
      Log out
    </Button>
  );
};
