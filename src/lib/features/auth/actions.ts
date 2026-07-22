'use server';

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from 'lib/services/auth/email.server';
import { hashPassword } from 'lib/services/auth/password.server';
import { checkRequestAuthRateLimit } from 'lib/services/auth/rate-limit.server';
import {
  type CredentialFieldErrors,
  normalizeEmail,
  normalizeLoginIdentifier,
  validateEmail,
  validatePassword,
  validateRegistrationInput,
} from 'lib/services/auth/security';
import {
  CredentialRegistrationError,
  createEmailVerificationToken,
  createPasswordResetToken,
  registerCredentialAccount,
  resetPasswordWithToken,
} from 'lib/services/database/auth.server';
import { redirect } from 'next/navigation';

export type RegistrationFormState = {
  email?: string;
  error?: string;
  fieldErrors?: CredentialFieldErrors;
  registered?: boolean;
  success?: string;
  username?: string;
};

export type EmailRequestFormState = {
  fieldErrors?: CredentialFieldErrors;
  success?: string;
};

export type ResetPasswordFormState = {
  error?: string;
  fieldErrors?: CredentialFieldErrors;
  invalidToken?: boolean;
};

const GENERIC_EMAIL_RESPONSE =
  'If an eligible account exists, an email is on its way. Check your inbox and spam folder.';
const GENERIC_EMAIL_MINIMUM_RESPONSE_MS = 700;

const readTextField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
};

const waitForGenericEmailResponse = async (startedAt: number) => {
  const remaining =
    GENERIC_EMAIL_MINIMUM_RESPONSE_MS - (Date.now() - startedAt);

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
};

export const registerWithCredentials = async (
  _previousState: RegistrationFormState,
  formData: FormData
): Promise<RegistrationFormState> => {
  const emailInput = readTextField(formData, 'email');
  const usernameInput = readTextField(formData, 'username');
  const password = readTextField(formData, 'password');
  const confirmPassword = readTextField(formData, 'confirmPassword');
  const { email, fieldErrors, username } = validateRegistrationInput({
    confirmPassword,
    email: emailInput,
    password,
    username: usernameInput,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { email, fieldErrors, username };
  }

  try {
    const withinLimit = await checkRequestAuthRateLimit('register', email);

    if (!withinLimit) {
      return {
        email,
        error: 'Too many registration attempts. Try again later.',
        username,
      };
    }

    const passwordHash = await hashPassword(password);
    const recipient = await registerCredentialAccount({
      email,
      passwordHash,
      username,
    });

    try {
      await sendVerificationEmail(recipient);
    } catch {
      return {
        email,
        registered: true,
        success:
          'Your account was created, but the verification email could not be delivered. Use resend below.',
        username,
      };
    }
  } catch (error) {
    if (error instanceof CredentialRegistrationError) {
      return {
        email,
        fieldErrors: {
          [error.field]:
            error.field === 'email'
              ? 'That email address is already registered.'
              : 'That username is already taken.',
        },
        username,
      };
    }

    return {
      email,
      error: 'Your account could not be created. Please try again.',
      username,
    };
  }

  return {
    email,
    registered: true,
    success:
      'Account created. Check your email to verify it before logging in.',
    username,
  };
};

export const resendVerificationEmail = async (
  _previousState: EmailRequestFormState,
  formData: FormData
): Promise<EmailRequestFormState> => {
  const identifier = normalizeLoginIdentifier(
    readTextField(formData, 'identifier')
  );

  if (!identifier) {
    return {
      fieldErrors: { identifier: 'Enter your email address or username.' },
    };
  }

  const startedAt = Date.now();

  try {
    const withinLimit = await checkRequestAuthRateLimit(
      'resendVerification',
      identifier
    );

    if (withinLimit) {
      const recipient = await createEmailVerificationToken(identifier);

      if (recipient) {
        await sendVerificationEmail(recipient).catch(() => undefined);
      }
    }
  } catch {
    // The response remains generic for missing accounts, limits, and delivery errors.
  }

  await waitForGenericEmailResponse(startedAt);
  return { success: GENERIC_EMAIL_RESPONSE };
};

export const requestPasswordReset = async (
  _previousState: EmailRequestFormState,
  formData: FormData
): Promise<EmailRequestFormState> => {
  const email = normalizeEmail(readTextField(formData, 'email'));
  const emailError = validateEmail(email);

  if (emailError) {
    return { fieldErrors: { email: emailError } };
  }

  const startedAt = Date.now();

  try {
    const withinLimit = await checkRequestAuthRateLimit(
      'forgotPassword',
      email
    );

    if (withinLimit) {
      const recipient = await createPasswordResetToken(email);

      if (recipient) {
        await sendPasswordResetEmail(recipient).catch(() => undefined);
      }
    }
  } catch {
    // Enumeration protection requires the same response for all valid emails.
  }

  await waitForGenericEmailResponse(startedAt);
  return { success: GENERIC_EMAIL_RESPONSE };
};

export const resetPassword = async (
  _previousState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> => {
  const token = readTextField(formData, 'token');
  const password = readTextField(formData, 'password');
  const confirmPassword = readTextField(formData, 'confirmPassword');
  const fieldErrors: CredentialFieldErrors = {};
  const passwordError = validatePassword(password);

  if (passwordError) {
    fieldErrors.password = passwordError;
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const withinLimit = await checkRequestAuthRateLimit(
      'resetPassword',
      token.slice(0, 32) || 'missing'
    );

    if (!withinLimit) {
      return { error: 'Too many reset attempts. Try again later.' };
    }

    const passwordHash = await hashPassword(password);
    const reset = await resetPasswordWithToken(token, passwordHash);

    if (!reset) {
      return { invalidToken: true };
    }
  } catch {
    return { error: 'Your password could not be reset. Please try again.' };
  }

  redirect('/login?reset=success');
};
