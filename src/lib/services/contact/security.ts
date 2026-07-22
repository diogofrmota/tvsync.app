export type ContactField = 'email' | 'message' | 'name' | 'subject';
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export const CONTACT_FIELD_LIMITS = {
  email: 254,
  message: 4000,
  messageMin: 10,
  name: 100,
  subject: 150,
} as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeContactEmail = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase();

export type ContactSubmissionInput = {
  email: string;
  message: string;
  name: string;
  subject: string;
};

export type ContactSubmissionValue = ContactSubmissionInput;

export const validateContactSubmission = (
  input: ContactSubmissionInput
): { fieldErrors: ContactFieldErrors; value: ContactSubmissionValue } => {
  const fieldErrors: ContactFieldErrors = {};
  const name = input.name.trim();
  const email = normalizeContactEmail(input.email);
  const subject = input.subject.trim();
  const message = input.message.trim();

  if (!name) {
    fieldErrors.name = 'Enter your name.';
  } else if (name.length > CONTACT_FIELD_LIMITS.name) {
    fieldErrors.name = `Keep your name under ${CONTACT_FIELD_LIMITS.name} characters.`;
  }

  if (!email) {
    fieldErrors.email = 'Enter your email address.';
  } else if (
    email.length > CONTACT_FIELD_LIMITS.email ||
    !emailPattern.test(email)
  ) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!subject) {
    fieldErrors.subject = 'Enter a subject.';
  } else if (subject.length > CONTACT_FIELD_LIMITS.subject) {
    fieldErrors.subject = `Keep the subject under ${CONTACT_FIELD_LIMITS.subject} characters.`;
  }

  if (!message) {
    fieldErrors.message = 'Enter a message.';
  } else if (message.length < CONTACT_FIELD_LIMITS.messageMin) {
    fieldErrors.message = `Enter at least ${CONTACT_FIELD_LIMITS.messageMin} characters.`;
  } else if (message.length > CONTACT_FIELD_LIMITS.message) {
    fieldErrors.message = `Keep your message under ${CONTACT_FIELD_LIMITS.message} characters.`;
  }

  return { fieldErrors, value: { email, message, name, subject } };
};

export const CONTACT_MIN_SUBMISSION_MS = 1500;

export const isHoneypotFilled = (value: string) => value.trim().length > 0;

export const isSubmittedTooFast = (
  renderedAtMs: number,
  submittedAtMs: number,
  minimumMs: number = CONTACT_MIN_SUBMISSION_MS
) => {
  const elapsed = submittedAtMs - renderedAtMs;

  return !(Number.isFinite(elapsed) && elapsed >= minimumMs);
};

export const isLikelySpamSubmission = (input: {
  honeypot: string;
  renderedAtMs: number;
  submittedAtMs: number;
}) =>
  isHoneypotFilled(input.honeypot) ||
  isSubmittedTooFast(input.renderedAtMs, input.submittedAtMs);
