import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FiArrowLeft } from 'react-icons/fi';

import {
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  ResetPasswordForm,
} from './forms';

type AuthShellProps = {
  backHref?: Route;
  backLabel?: string;
  children: ReactNode;
  heading: string;
};

export const AuthShell = ({
  backHref,
  backLabel,
  children,
  heading,
}: AuthShellProps) => (
  <Stack
    margin="auto"
    maxWidth="32rem"
    padding={{ base: 4, sm: 6 }}
    width="full"
  >
    {backHref && backLabel ? (
      <Box
        _hover={{ textDecoration: 'underline' }}
        alignSelf="flex-start"
        asChild
        color="white"
        marginBottom={4}
      >
        <Link href={backHref}>
          <FiArrowLeft aria-hidden /> {backLabel}
        </Link>
      </Box>
    ) : null}
    <Stack
      background="white"
      borderRadius="xl"
      boxShadow="0 18px 60px rgba(0, 0, 0, 0.35)"
      color="black"
      gap={6}
      padding={{ base: 6, sm: 8 }}
    >
      <Stack gap={2} textAlign="center">
        <Text fontSize="xl" fontWeight="700">
          TvSync
        </Text>
        <Heading as="h1" fontSize={{ base: '2xl', sm: '3xl' }}>
          {heading}
        </Heading>
      </Stack>
      {children}
    </Stack>
  </Stack>
);

const errorMessages: Record<string, string> = {
  AccessDenied:
    'Google sign-in was accepted, but TvSync could not finish the session. Please try again.',
  Configuration:
    'Authentication is not configured yet. Please try again later.',
  OAuthAccountNotLinked:
    'This email is already connected to a different Google identity. Log in with the existing method.',
  OAuthCallback:
    'Google could not finish the sign-in request. Please try again.',
  OAuthSignin: 'Google sign-in could not start. Please try again.',
  default: 'Sign-in failed. Please try again.',
};

export const getAuthErrorMessage = (error?: string) =>
  error ? (errorMessages[error] ?? errorMessages.default) : null;

export const LoginAuthPage = (props: {
  callbackUrl: string;
  error?: string;
  googleEnabled: boolean;
  passwordReset?: boolean;
  successMessage?: string;
}) => (
  <AuthShell backHref="/" backLabel="Back to Home" heading="Login">
    <LoginForm
      callbackUrl={props.callbackUrl}
      errorMessage={getAuthErrorMessage(props.error)}
      googleEnabled={props.googleEnabled}
      passwordReset={props.passwordReset}
      successMessage={props.successMessage}
    />
  </AuthShell>
);

export const RegisterAuthPage = (props: {
  callbackUrl: string;
  error?: string;
  googleEnabled: boolean;
}) => (
  <AuthShell backHref="/" backLabel="Back to Home" heading="Create an Account">
    <RegisterForm
      callbackUrl={props.callbackUrl}
      errorMessage={getAuthErrorMessage(props.error)}
      googleEnabled={props.googleEnabled}
    />
  </AuthShell>
);

export const ForgotPasswordAuthPage = () => (
  <AuthShell
    backHref="/login"
    backLabel="Back to Login"
    heading="Reset Password"
  >
    <ForgotPasswordForm />
  </AuthShell>
);

export const ResetPasswordAuthPage = (props: {
  token: string;
  tokenValid: boolean;
}) => (
  <AuthShell heading="Create a New Password">
    <ResetPasswordForm token={props.token} tokenValid={props.tokenValid} />
  </AuthShell>
);

export const VerifyEmailAuthPage = ({ verified }: { verified: boolean }) => (
  <AuthShell
    heading={verified ? 'Email Verified' : 'Verification Link Invalid'}
  >
    <Stack gap={5} textAlign="center">
      <Text color="gray.700" role={verified ? 'status' : 'alert'}>
        {verified
          ? 'Your email is verified. You can now log in to TvSync.'
          : 'This verification link is invalid, expired, or has already been used.'}
      </Text>
      <Box
        _hover={{ textDecoration: 'underline' }}
        asChild
        color="teal.700"
        fontWeight="600"
      >
        <Link href={verified ? '/login' : '/login?verification=required'}>
          {verified
            ? 'Continue to Login'
            : 'Return to Login to request a new link'}
        </Link>
      </Box>
    </Stack>
  </AuthShell>
);

export const EmailChangeVerificationPage = ({
  changed,
}: {
  changed: boolean;
}) => (
  <AuthShell heading={changed ? 'Email Updated' : 'Email Change Link Invalid'}>
    <Stack gap={5} textAlign="center">
      <Text color="gray.700" role={changed ? 'status' : 'alert'}>
        {changed
          ? 'Your email address was updated. For your security, sign in again with the updated account.'
          : 'This email-change link is invalid, expired, already used, or the address is no longer available.'}
      </Text>
      <Box
        _hover={{ textDecoration: 'underline' }}
        asChild
        color="teal.700"
        fontWeight="600"
      >
        <Link href={changed ? '/login?account=email-updated' : '/profile/edit'}>
          {changed ? 'Continue to Login' : 'Return to Edit Profile'}
        </Link>
      </Box>
    </Stack>
  </AuthShell>
);
