import 'server-only';

import { getApplicationOrigin } from 'lib/services/auth/callback-url';
import { Resend } from 'resend';

let resendClient: Resend | null = null;

const getRequiredEmailConfiguration = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!(apiKey && from)) {
    throw new Error(
      'Authentication email delivery requires RESEND_API_KEY and AUTH_EMAIL_FROM.'
    );
  }

  return { apiKey, from };
};

const getResend = () => {
  const { apiKey } = getRequiredEmailConfiguration();

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

export const escapeEmailHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getAuthLink = (pathname: string, token: string) => {
  const url = new URL(pathname, getApplicationOrigin());
  url.searchParams.set('token', token);

  return url.toString();
};

const sendAuthEmail = async (input: {
  html: string;
  subject: string;
  text: string;
  to: string;
}) => {
  const { from } = getRequiredEmailConfiguration();
  const { error } = await getResend().emails.send({
    from,
    html: input.html,
    replyTo: process.env.AUTH_EMAIL_REPLY_TO,
    subject: input.subject,
    text: input.text,
    to: input.to,
  });

  if (error) {
    throw new Error('Resend could not deliver the authentication email.');
  }
};

export const sendVerificationEmail = async (input: {
  email: string;
  token: string;
  username: string;
}) => {
  const link = getAuthLink('/verify-email', input.token);
  const safeUsername = escapeEmailHtml(input.username);
  const safeLink = escapeEmailHtml(link);

  await sendAuthEmail({
    html: `<p>Hello ${safeUsername},</p><p>Verify your TvSync email address:</p><p><a href="${safeLink}">Verify email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`,
    subject: 'Verify your TvSync email',
    text: `Hello ${input.username},\n\nVerify your TvSync email address: ${link}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
    to: input.email,
  });
};

export const sendPasswordResetEmail = async (input: {
  email: string;
  token: string;
  username: string;
}) => {
  const link = getAuthLink('/reset-password', input.token);
  const safeUsername = escapeEmailHtml(input.username);
  const safeLink = escapeEmailHtml(link);

  await sendAuthEmail({
    html: `<p>Hello ${safeUsername},</p><p>Create a new TvSync password:</p><p><a href="${safeLink}">Reset password</a></p><p>This link expires in 24 hours and can be used once. If you did not request it, you can ignore this email.</p>`,
    subject: 'Reset your TvSync password',
    text: `Hello ${input.username},\n\nCreate a new TvSync password: ${link}\n\nThis link expires in 24 hours and can be used once. If you did not request it, you can ignore this email.`,
    to: input.email,
  });
};

export const sendEmailChangeVerification = async (input: {
  email: string;
  token: string;
  username: string;
}) => {
  const link = getAuthLink('/verify-email-change', input.token);
  const safeUsername = escapeEmailHtml(input.username);
  const safeLink = escapeEmailHtml(link);

  await sendAuthEmail({
    html: `<p>Hello ${safeUsername},</p><p>Confirm this as your new TvSync email address:</p><p><a href="${safeLink}">Confirm email change</a></p><p>This link expires in 24 hours and can be used once. Your current email remains active until you confirm.</p>`,
    subject: 'Confirm your new TvSync email',
    text: `Hello ${input.username},\n\nConfirm this as your new TvSync email address: ${link}\n\nThis link expires in 24 hours and can be used once. Your current email remains active until you confirm.`,
    to: input.email,
  });
};

export const sendEmailChangedNotice = async (input: {
  email: string;
  newEmail: string;
}) => {
  await sendAuthEmail({
    html: `<p>Your TvSync account email was changed to ${escapeEmailHtml(input.newEmail)}.</p><p>If you did not make this change, contact TvSync immediately and reset your password.</p>`,
    subject: 'Your TvSync email was changed',
    text: `Your TvSync account email was changed to ${input.newEmail}.\n\nIf you did not make this change, contact TvSync immediately and reset your password.`,
    to: input.email,
  });
};
