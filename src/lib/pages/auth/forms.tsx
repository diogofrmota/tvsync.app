'use client';

import {
  Box,
  Button,
  Field,
  Input,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  type EmailRequestFormState,
  type RegistrationFormState,
  type ResetPasswordFormState,
  registerWithCredentials,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
} from 'lib/features/auth/actions';
import { EMAIL_UNVERIFIED_ERROR } from 'lib/services/auth/constants';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type FormEvent, useActionState, useState } from 'react';

import { OAuthButtons } from './client-actions';

const initialRegistrationState: RegistrationFormState = {};
const initialEmailRequestState: EmailRequestFormState = {};
const initialResetState: ResetPasswordFormState = {};

const Feedback = ({
  error,
  success,
}: {
  error?: string | null;
  success?: string;
}) => (
  <>
    {error ? (
      <Box
        aria-live="assertive"
        borderColor="red.500"
        borderRadius="md"
        borderWidth="1px"
        color="red.700"
        padding={4}
        role="alert"
      >
        {error}
      </Box>
    ) : null}
    {success ? (
      <Box
        aria-live="polite"
        borderColor="green.600"
        borderRadius="md"
        borderWidth="1px"
        color="green.700"
        padding={4}
        role="status"
      >
        {success}
      </Box>
    ) : null}
  </>
);

const ProviderDivider = () => (
  <Stack align="center" direction="row" gap={3}>
    <Separator flex="1" />
    <Text color="gray.600" fontSize="sm">
      or
    </Text>
    <Separator flex="1" />
  </Stack>
);

const GoogleAvailability = ({ enabled }: { enabled: boolean }) =>
  enabled ? null : (
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
  );

export const ResendVerificationForm = ({
  identifier,
}: {
  identifier: string;
}) => {
  const [state, formAction, isPending] = useActionState(
    resendVerificationEmail,
    initialEmailRequestState
  );

  return (
    <form action={formAction}>
      <Stack gap={3}>
        <input name="identifier" type="hidden" value={identifier} />
        <Button loading={isPending} size="sm" type="submit" variant="outline">
          Resend verification email
        </Button>
        <Feedback success={state.success} />
      </Stack>
    </form>
  );
};

export const RegisterForm = ({
  callbackUrl,
  errorMessage,
  googleEnabled,
}: {
  callbackUrl: string;
  errorMessage: string | null;
  googleEnabled: boolean;
}) => {
  const [state, formAction, isPending] = useActionState(
    registerWithCredentials,
    initialRegistrationState
  );

  return (
    <Stack gap={5}>
      <Feedback error={state.error ?? errorMessage} success={state.success} />
      {state.registered ? (
        <ResendVerificationForm identifier={state.email ?? ''} />
      ) : (
        <form action={formAction}>
          <fieldset
            disabled={isPending}
            style={{ border: 0, margin: 0, padding: 0 }}
          >
            <Stack gap={4}>
              <Field.Root invalid={Boolean(state.fieldErrors?.email)} required>
                <Field.Label>Email address</Field.Label>
                <Input
                  autoCapitalize="none"
                  autoComplete="email"
                  defaultValue={state.email}
                  inputMode="email"
                  maxLength={254}
                  name="email"
                  type="email"
                />
                <Field.ErrorText>{state.fieldErrors?.email}</Field.ErrorText>
              </Field.Root>
              <Field.Root
                invalid={Boolean(state.fieldErrors?.username)}
                required
              >
                <Field.Label>Username</Field.Label>
                <Input
                  autoCapitalize="none"
                  autoComplete="username"
                  defaultValue={state.username}
                  maxLength={24}
                  name="username"
                  pattern="[A-Za-z0-9_]{3,24}"
                  type="text"
                />
                <Field.HelperText>
                  3-24 letters, numbers, or underscores.
                </Field.HelperText>
                <Field.ErrorText>{state.fieldErrors?.username}</Field.ErrorText>
              </Field.Root>
              <Field.Root
                invalid={Boolean(state.fieldErrors?.password)}
                required
              >
                <Field.Label>Password</Field.Label>
                <Input
                  autoComplete="new-password"
                  maxLength={128}
                  minLength={12}
                  name="password"
                  type="password"
                />
                <Field.HelperText>
                  At least 12 characters with a letter and a number.
                </Field.HelperText>
                <Field.ErrorText>{state.fieldErrors?.password}</Field.ErrorText>
              </Field.Root>
              <Field.Root
                invalid={Boolean(state.fieldErrors?.confirmPassword)}
                required
              >
                <Field.Label>Confirm password</Field.Label>
                <Input
                  autoComplete="new-password"
                  maxLength={128}
                  minLength={12}
                  name="confirmPassword"
                  type="password"
                />
                <Field.ErrorText>
                  {state.fieldErrors?.confirmPassword}
                </Field.ErrorText>
              </Field.Root>
              <Button loading={isPending} size="lg" type="submit">
                Create Account
              </Button>
            </Stack>
          </fieldset>
        </form>
      )}
      <ProviderDivider />
      <GoogleAvailability enabled={googleEnabled} />
      <OAuthButtons callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
      <Text textAlign="center">
        <a href="/login">Already registered? Log in</a>
      </Text>
    </Stack>
  );
};

export const LoginForm = ({
  callbackUrl,
  errorMessage,
  googleEnabled,
  passwordReset,
  successMessage,
}: {
  callbackUrl: string;
  errorMessage: string | null;
  googleEnabled: boolean;
  passwordReset?: boolean;
  successMessage?: string;
}) => {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(errorMessage);
  const [unverified, setUnverified] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    setIsPending(true);
    setLoginError(null);
    setUnverified(false);

    try {
      const result = await signIn('credentials', {
        identifier,
        password: typeof password === 'string' ? password : '',
        redirect: false,
      });

      if (result?.ok) {
        router.push(callbackUrl as Route);
        router.refresh();
        return;
      }

      if (result?.error?.includes(EMAIL_UNVERIFIED_ERROR)) {
        setUnverified(true);
        setLoginError('Verify your email before logging in.');
      } else {
        setLoginError('Invalid email address, username, or password.');
      }
    } catch {
      setLoginError('Login could not be completed. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Stack gap={5}>
      <Feedback
        error={loginError}
        success={
          successMessage ??
          (passwordReset
            ? 'Password reset. Log in with your new password.'
            : undefined)
        }
      />
      <form onSubmit={handleSubmit}>
        <fieldset
          disabled={isPending}
          style={{ border: 0, margin: 0, padding: 0 }}
        >
          <Stack gap={4}>
            <Field.Root required>
              <Field.Label>Email address or username</Field.Label>
              <Input
                autoCapitalize="none"
                autoComplete="username"
                maxLength={254}
                name="identifier"
                onChange={(event) => setIdentifier(event.currentTarget.value)}
                type="text"
                value={identifier}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Password</Field.Label>
              <Input
                autoComplete="current-password"
                maxLength={128}
                name="password"
                type="password"
              />
            </Field.Root>
            <Button loading={isPending} size="lg" type="submit">
              Login
            </Button>
          </Stack>
        </fieldset>
      </form>
      {unverified ? <ResendVerificationForm identifier={identifier} /> : null}
      <ProviderDivider />
      <GoogleAvailability enabled={googleEnabled} />
      <OAuthButtons callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
      <Text textAlign="center">
        <a href="/forgot-password">Forgot password?</a>
      </Text>
      <Text textAlign="center">
        <a href="/register">New user? Create an account</a>
      </Text>
    </Stack>
  );
};

export const ForgotPasswordForm = () => {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialEmailRequestState
  );

  return (
    <form action={formAction}>
      <fieldset
        disabled={isPending}
        style={{ border: 0, margin: 0, padding: 0 }}
      >
        <Stack gap={5}>
          <Feedback success={state.success} />
          <Field.Root invalid={Boolean(state.fieldErrors?.email)} required>
            <Field.Label>Email address</Field.Label>
            <Input
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              name="email"
              type="email"
            />
            <Field.ErrorText>{state.fieldErrors?.email}</Field.ErrorText>
          </Field.Root>
          <Button loading={isPending} size="lg" type="submit">
            Send Reset Email
          </Button>
        </Stack>
      </fieldset>
    </form>
  );
};

export const ResetPasswordForm = ({
  token,
  tokenValid,
}: {
  token: string;
  tokenValid: boolean;
}) => {
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    initialResetState
  );
  const invalidToken = !tokenValid || state.invalidToken;

  if (invalidToken) {
    return (
      <Stack gap={5} textAlign="center">
        <Feedback error="This reset link is invalid, expired, or has already been used." />
        <Box asChild color="teal.700" fontWeight="600">
          <a href="/forgot-password">Request a new reset link</a>
        </Box>
      </Stack>
    );
  }

  return (
    <form action={formAction}>
      <fieldset
        disabled={isPending}
        style={{ border: 0, margin: 0, padding: 0 }}
      >
        <Stack gap={5}>
          <input name="token" type="hidden" value={token} />
          <Feedback error={state.error} />
          <Field.Root invalid={Boolean(state.fieldErrors?.password)} required>
            <Field.Label>New password</Field.Label>
            <Input
              autoComplete="new-password"
              maxLength={128}
              minLength={12}
              name="password"
              type="password"
            />
            <Field.HelperText>
              At least 12 characters with a letter and a number.
            </Field.HelperText>
            <Field.ErrorText>{state.fieldErrors?.password}</Field.ErrorText>
          </Field.Root>
          <Field.Root
            invalid={Boolean(state.fieldErrors?.confirmPassword)}
            required
          >
            <Field.Label>Confirm new password</Field.Label>
            <Input
              autoComplete="new-password"
              maxLength={128}
              minLength={12}
              name="confirmPassword"
              type="password"
            />
            <Field.ErrorText>
              {state.fieldErrors?.confirmPassword}
            </Field.ErrorText>
          </Field.Root>
          <Button loading={isPending} size="lg" type="submit">
            Reset Password
          </Button>
        </Stack>
      </fieldset>
    </form>
  );
};
