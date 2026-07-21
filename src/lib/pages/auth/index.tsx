import { Box, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import type { AuthPageMode } from 'lib/pages/auth/types';
import type { Route } from 'next';
import Link from 'next/link';

import { OAuthButtons } from './client-actions';

type AuthPageProps = {
  callbackUrl: string;
  error?: string;
  googleEnabled: boolean;
  mode: AuthPageMode;
};

const errorMessages: Record<string, string> = {
  Configuration:
    'Authentication is not configured yet. Check the OAuth environment variables.',
  AccessDenied:
    'Google sign-in was accepted, but TVSync could not finish the session. Please try again.',
  OAuthSignin: 'Google sign-in could not start. Please try again.',
  OAuthCallback:
    'Google could not finish the sign-in request. Please try again.',
  OAuthAccountNotLinked:
    'This email is already connected to another sign-in method.',
  default: 'Sign-in failed. Please try again.',
};

export const getAuthErrorMessage = (error?: string) => {
  if (!error) {
    return null;
  }

  return errorMessages[error] ?? errorMessages.default;
};

export const AuthPage = ({
  callbackUrl,
  error,
  googleEnabled,
  mode,
}: AuthPageProps) => {
  const isRegister = mode === 'register';
  const title = isRegister ? 'Create your TVSync account' : 'Log in to TVSync';
  const intro = isRegister
    ? 'Use Google to create an account. Email/password registration is not enabled for this auth layer yet.'
    : 'Use Google to continue. Email/password login and password reset are not enabled yet.';
  const alternateHref = isRegister ? '/login' : '/register';
  const alternateLabel = isRegister
    ? 'Already have an account? Log in'
    : 'New to TVSync? Create an account';
  const errorMessage = getAuthErrorMessage(error);

  return (
    <Grid gap={8} marginX="auto" maxWidth="32rem" paddingX={8}>
      <VStack align="stretch" gap={3} textAlign="center">
        <Heading as="h1" fontSize={['2xl', '4xl']}>
          {title}
        </Heading>
        <Text color="fg.muted">{intro}</Text>
      </VStack>

      {errorMessage && (
        <Box
          borderColor="red.300"
          borderRadius="md"
          borderWidth="1px"
          color="red.500"
          padding={4}
        >
          {errorMessage}
        </Box>
      )}

      {!googleEnabled && (
        <Box
          borderColor="orange.300"
          borderRadius="md"
          borderWidth="1px"
          color="orange.500"
          padding={4}
        >
          Google OAuth is unavailable until `GOOGLE_CLIENT_ID` and
          `GOOGLE_CLIENT_SECRET` are configured.
        </Box>
      )}

      <OAuthButtons callbackUrl={callbackUrl} googleEnabled={googleEnabled} />

      <HStack justify="center">
        <Link href={alternateHref as Route}>{alternateLabel}</Link>
      </HStack>
    </Grid>
  );
};
