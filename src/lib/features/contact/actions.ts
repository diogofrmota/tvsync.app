'use server';

import { sendContactMessage } from 'lib/services/contact/email.server';
import {
  checkContactRateLimit,
  isDuplicateContactSubmission,
} from 'lib/services/contact/rate-limit.server';
import {
  type ContactFieldErrors,
  isLikelySpamSubmission,
  validateContactSubmission,
} from 'lib/services/contact/security';

export type ContactFormState = {
  error?: string;
  fieldErrors?: ContactFieldErrors;
  success?: boolean;
  values?: { email: string; name: string; subject: string };
};

const GENERIC_FAILURE_MESSAGE =
  'TvSync could not send your message right now. Please try again in a few minutes.';
const RATE_LIMIT_MESSAGE =
  'Too many messages sent recently. Please try again later.';

const readTextField = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
};

const readTimestampField = (formData: FormData, name: string) => {
  const value = formData.get(name);
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : 0;
};

export const submitContactMessage = async (
  _previousState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> => {
  const nameInput = readTextField(formData, 'name');
  const emailInput = readTextField(formData, 'email');
  const subjectInput = readTextField(formData, 'subject');
  const messageInput = readTextField(formData, 'message');
  // Honeypot field: real visitors never see or fill it; only automated bots do.
  const honeypot = readTextField(formData, 'company');
  const renderedAtMs = readTimestampField(formData, 'renderedAt');

  const values = {
    email: emailInput,
    name: nameInput,
    subject: subjectInput,
  };
  const { fieldErrors, value } = validateContactSubmission({
    email: emailInput,
    message: messageInput,
    name: nameInput,
    subject: subjectInput,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  if (
    isLikelySpamSubmission({
      honeypot,
      renderedAtMs,
      submittedAtMs: Date.now(),
    })
  ) {
    // Report success without sending so automated submissions cannot tell
    // detection from delivery.
    return { success: true };
  }

  try {
    const withinLimit = await checkContactRateLimit(value.email);

    if (!withinLimit) {
      return { error: RATE_LIMIT_MESSAGE, values };
    }

    const isDuplicate = await isDuplicateContactSubmission(value);

    if (isDuplicate) {
      return { success: true };
    }

    await sendContactMessage(value);
  } catch {
    return { error: GENERIC_FAILURE_MESSAGE, values };
  }

  return { success: true };
};
