import 'server-only';

import { escapeHtml } from 'lib/utils/html';
import { Resend } from 'resend';

let resendClient: Resend | null = null;

const getRequiredContactEmailConfiguration = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM;
  const to = process.env.CONTACT_EMAIL_TO;

  if (!(apiKey && from && to)) {
    throw new Error(
      'Contact email delivery requires RESEND_API_KEY, CONTACT_EMAIL_FROM (or AUTH_EMAIL_FROM), and CONTACT_EMAIL_TO.'
    );
  }

  return { apiKey, from, to };
};

const getResend = () => {
  const { apiKey } = getRequiredContactEmailConfiguration();

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

export const sendContactMessage = async (input: {
  email: string;
  message: string;
  name: string;
  subject: string;
}) => {
  const { from, to } = getRequiredContactEmailConfiguration();
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />');

  const { error } = await getResend().emails.send({
    from,
    html: `<p><strong>From:</strong> ${safeName} (${safeEmail})</p><p><strong>Subject:</strong> ${safeSubject}</p><p>${safeMessage}</p>`,
    replyTo: input.email,
    subject: `[TvSync Contact] ${input.subject}`,
    text: `From: ${input.name} (${input.email})\nSubject: ${input.subject}\n\n${input.message}`,
    to,
  });

  if (error) {
    throw new Error('Resend could not deliver the contact message.');
  }
};
