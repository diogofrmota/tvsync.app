import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import type { AuthPageMode } from 'lib/pages/auth/types';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

import { OAuthButtons } from './client-actions';

type AuthPageProps = {
  callbackUrl: string;
  error?: string;
  googleEnabled: boolean;
  mode: AuthPageMode;
};

const errorMessages: Record<string, string> = {
  Configuration:
    'Authentication is not configured yet. Please try again later.',
  AccessDenied:
    'Google sign-in was accepted, but TvSync could not finish the session. Please try again.',
  OAuthSignin: 'Google sign-in could not start. Please try again.',
  OAuthCallback:
    'Google could not finish the sign-in request. Please try again.',
  OAuthAccountNotLinked:
    'This email is already connected to another sign-in method.',
  default: 'Sign-in failed. Please try again.',
};

export const getAuthErrorMessage = (error?: string) =>
  error ? (errorMessages[error] ?? errorMessages.default) : null;

export const AuthPage = ({
  callbackUrl,
  error,
  googleEnabled,
  mode,
}: AuthPageProps) => {
  const register = mode === 'register';
  const errorMessage = getAuthErrorMessage(error);
  return (
    <Stack
      margin="auto"
      maxWidth="32rem"
      padding={{ base: 4, sm: 6 }}
      width="full"
    >
      <Box alignSelf="flex-start" asChild color="white" marginBottom={4}>
        <Link href="/">
          <FiArrowLeft aria-hidden /> Back to Home
        </Link>
      </Box>
      <Stack
        background="white"
        borderRadius="xl"
        color="black"
        gap={6}
        padding={{ base: 6, sm: 8 }}
      >
        <Stack gap={2} textAlign="center">
          <Text fontSize="xl" fontWeight="700">
            TvSync
          </Text>
          <Heading as="h1" fontSize={{ base: '2xl', sm: '3xl' }}>
            {register ? 'Create an Account' : 'Login'}
          </Heading>
          <Text color="gray.600">
            Continue securely with your Google account.
          </Text>
        </Stack>
        {errorMessage ? (
          <Box
            aria-live="assertive"
            borderColor="red.500"
            borderRadius="md"
            borderWidth="1px"
            color="red.700"
            padding={4}
            role="alert"
          >
            {errorMessage}
          </Box>
        ) : null}
        {googleEnabled ? null : (
          <Box
            aria-live="polite"
            borderColor="orange.500"
            borderRadius="md"
            borderWidth="1px"
            color="orange.700"
            padding={4}
            role="status"
          >
            Google sign-in is temporarily unavailable.
          </Box>
        )}
        <OAuthButtons callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
        <Text textAlign="center">
          <Link href={register ? '/login' : '/register'}>
            {register
              ? 'Already registered? Log in'
              : 'New user? Create an account'}
          </Link>
        </Text>
      </Stack>
    </Stack>
  );
};
