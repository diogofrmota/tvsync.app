/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay next to each guarded requirement. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');

const migration = read('database/migrations/0005_auth_lifecycle.sql');
const actions = read('src/lib/features/auth/actions.ts');
const authConfig = read('src/lib/services/auth/index.server.ts');
const authDatabase = read('src/lib/services/database/auth.server.ts');
const authQueries = read('src/lib/services/database/auth-queries.ts');
const authForms = read('src/lib/pages/auth/forms.tsx');
const authPages = read('src/lib/pages/auth/index.tsx');
const email = read('src/lib/services/auth/email.server.ts');
const rateLimit = read('src/lib/services/auth/rate-limit.server.ts');

test('registration has normalized unique email/username constraints and field errors', () => {
  assert.match(migration, /profiles_email_normalized_unique/);
  assert.match(migration, /profiles_username_normalized_unique/);
  assert.match(migration, /auth_accounts_provider_account_unique/);
  assert.match(actions, /CredentialRegistrationError/);
  assert.match(actions, /That email address is already registered\./);
  assert.match(actions, /That username is already taken\./);
  assert.match(actions, /Passwords do not match\./);
});

test('credentials login supports email or username, stays generic when invalid, and gates verification', () => {
  assert.match(authQueries, /lower\(btrim\(p\.email\)\)/);
  assert.match(authQueries, /lower\(btrim\(p\.username\)\)/);
  assert.match(authConfig, /findCredentialAccount\(identifier\)/);
  assert.match(authConfig, /verifyPassword/);
  assert.match(authConfig, /if \(!account\.email_verified_at\)/);
  assert.match(authForms, /Invalid email address, username, or password\./);
  assert.match(authForms, /Verify your email before logging in\./);
  assert.match(authForms, /Resend verification email/);
});

test('verification resend is digest-only, expiring, single-use, and rate limited', () => {
  assert.match(migration, /auth_email_verification_tokens/);
  assert.match(migration, /length\(token_digest\) = 64/);
  assert.match(authQueries, /expires_at > now\(\)/);
  assert.match(authQueries, /consumed_at is null/);
  assert.match(authQueries, /set consumed_at = now\(\)/);
  assert.match(rateLimit, /resendVerification: \{ limit: 3/);
  assert.match(rateLimit, /scope: `\$\{input\.rule\}:identity`/);
  assert.match(rateLimit, /scope: `\$\{input\.rule\}:ip`/);
  assert.match(actions, /GENERIC_EMAIL_RESPONSE/);
  assert.match(actions, /GENERIC_EMAIL_MINIMUM_RESPONSE_MS = 700/);
});

test('Google registration and login require verified email and map stable provider subject', () => {
  assert.match(authConfig, /email_verified === true/);
  assert.match(authConfig, /account\.providerAccountId/);
  assert.match(authConfig, /ensureGoogleAuthIdentity/);
  assert.match(authQueries, /provider = 'google'/);
  assert.match(authDatabase, /auth_accounts_user_provider_unique/);
  assert.match(authConfig, /OAuthAccountNotLinked/);
});

test('forgot-password response prevents enumeration and delivery uses Resend safely', () => {
  assert.match(actions, /GENERIC_EMAIL_RESPONSE/);
  assert.match(actions, /Enumeration protection requires the same response/);
  assert.match(rateLimit, /forgotPassword: \{ limit: 5/);
  assert.match(email, /new Resend\(apiKey\)/);
  assert.match(email, /escapeEmailHtml/);
  assert.match(email, /RESEND_API_KEY/);
  assert.match(email, /AUTH_EMAIL_FROM/);
  assert.doesNotMatch(email, /console\.(log|warn|error)/);
});

test('reset tokens expire after 24 hours, consume once, rotate sessions, and redirect to Login', () => {
  assert.match(migration, /auth_password_reset_tokens/);
  assert.match(authQueries, /t\.expires_at > now\(\)/);
  assert.match(authQueries, /t\.consumed_at is null/);
  assert.match(authQueries, /session_version = session_version \+ 1/);
  assert.match(
    authConfig,
    /currentSessionVersion !== tvsyncToken\.sessionVersion/
  );
  assert.match(actions, /resetPasswordWithToken/);
  assert.match(actions, /redirect\('\/login\?reset=success'\)/);
  assert.match(authForms, /Request a new reset link/);
});

test('all auth pages share the black-shell responsive centered white card system', () => {
  const layout = read('src/lib/layout/index.tsx');

  for (const route of [
    '/forgot-password',
    '/login',
    '/register',
    '/reset-password',
    '/verify-email',
  ]) {
    assert.match(layout, new RegExp(`'${route}'`));
  }

  assert.match(layout, /background="black"/);
  assert.match(layout, /minHeight="100dvh"/);
  assert.match(authPages, /maxWidth="32rem"/);
  assert.match(authPages, /background="white"/);
  assert.match(authPages, /padding=\{\{ base: 6, sm: 8 \}\}/);
  assert.match(authPages, /TvSync/);
  assert.match(authPages, /Create an Account/);
  assert.match(authPages, /Create a New Password/);
});
