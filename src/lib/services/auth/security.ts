import { createHash, createHmac, randomBytes } from 'node:crypto';

export const AUTH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MAX_BYTES = 72;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordLetterPattern = /[A-Za-z]/;
const passwordNumberPattern = /\d/;
const usernamePattern = /^[a-z0-9_]{3,24}$/;

export type CredentialField =
  | 'confirmPassword'
  | 'email'
  | 'identifier'
  | 'password'
  | 'username';

export type CredentialFieldErrors = Partial<Record<CredentialField, string>>;

export const normalizeEmail = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase();

export const normalizeUsername = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '_');

export const normalizeLoginIdentifier = (value: string) => {
  const normalized = value.normalize('NFKC').trim().toLowerCase();

  return normalized.includes('@')
    ? normalizeEmail(normalized)
    : normalizeUsername(normalized);
};

export const validateEmail = (email: string) => {
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return 'Enter a valid email address.';
  }

  return null;
};

export const validateUsername = (username: string) => {
  if (!usernamePattern.test(username)) {
    return 'Use 3-24 lowercase letters, numbers, or underscores.';
  }

  return null;
};

export const validatePassword = (password: string) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (
    password.length > PASSWORD_MAX_LENGTH ||
    Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES
  ) {
    return 'Use a password no longer than 72 UTF-8 bytes.';
  }

  if (
    !(
      passwordLetterPattern.test(password) &&
      passwordNumberPattern.test(password)
    )
  ) {
    return 'Include at least one letter and one number.';
  }

  return null;
};

export const validateRegistrationInput = (input: {
  confirmPassword: string;
  email: string;
  password: string;
  username: string;
}) => {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const fieldErrors: CredentialFieldErrors = {};
  const emailError = validateEmail(email);
  const usernameError = validateUsername(username);
  const passwordError = validatePassword(input.password);

  if (emailError) {
    fieldErrors.email = emailError;
  }

  if (usernameError) {
    fieldErrors.username = usernameError;
  }

  if (passwordError) {
    fieldErrors.password = passwordError;
  }

  if (input.password !== input.confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  return { email, fieldErrors, username };
};

export const createAuthToken = () => randomBytes(32).toString('base64url');

export const digestAuthToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const getAuthTokenExpiry = (now = new Date()) =>
  new Date(now.getTime() + AUTH_TOKEN_TTL_MS);

export const isAuthTokenFresh = (expiresAt: Date | string, now = new Date()) =>
  new Date(expiresAt).getTime() > now.getTime();

export const digestRateLimitKey = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('hex');

export const getAuthRateLimitKeyDigests = (input: {
  discriminator: string;
  ipAddress: string;
  secret: string;
}) => ({
  identityKeyDigest: digestRateLimitKey(input.discriminator, input.secret),
  ipKeyDigest: digestRateLimitKey(input.ipAddress, input.secret),
});
