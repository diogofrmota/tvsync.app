import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getSafeAuthRedirectUrl,
  getSafeCallbackUrl,
} from '../src/lib/services/auth/callback-url';
import {
  hashPasswordCore,
  PASSWORD_HASH_ROUNDS,
  verifyPasswordCore,
} from '../src/lib/services/auth/password-core';
import {
  AUTH_TOKEN_TTL_MS,
  digestAuthToken,
  digestRateLimitKey,
  getAuthRateLimitKeyDigests,
  getAuthTokenExpiry,
  isAuthTokenFresh,
  normalizeEmail,
  normalizeLoginIdentifier,
  normalizeUsername,
  validateRegistrationInput,
} from '../src/lib/services/auth/security';

const bcryptWorkFactorPattern = /^\$2[aby]\$12\$/;
const rawRateLimitDataPattern = /user|example|127/;

test('email and username normalization prevents case and compatibility duplicates', () => {
  assert.equal(normalizeEmail('  USER@Example.COM '), 'user@example.com');
  assert.equal(normalizeEmail('ＵＳＥＲ@example.com'), 'user@example.com');
  assert.equal(normalizeUsername('  Alice Smith  '), 'alice_smith');
  assert.equal(normalizeUsername('Ａｌｉｃｅ'), 'alice');
  assert.equal(normalizeLoginIdentifier('Alice'), 'alice');
  assert.equal(normalizeLoginIdentifier('A@EXAMPLE.COM'), 'a@example.com');
});

test('registration validation catches duplicate-shape input and password mismatch', () => {
  const valid = validateRegistrationInput({
    confirmPassword: 'CorrectHorse1',
    email: 'Person@Example.com',
    password: 'CorrectHorse1',
    username: 'Person_Name',
  });
  assert.deepEqual(valid.fieldErrors, {});
  assert.equal(valid.email, 'person@example.com');
  assert.equal(valid.username, 'person_name');

  const invalid = validateRegistrationInput({
    confirmPassword: 'DifferentHorse2',
    email: 'not-an-email',
    password: 'short',
    username: 'x',
  });
  assert.ok(invalid.fieldErrors.email);
  assert.ok(invalid.fieldErrors.username);
  assert.ok(invalid.fieldErrors.password);
  assert.equal(invalid.fieldErrors.confirmPassword, 'Passwords do not match.');
});

test('password hashing uses a work factor and never stores plaintext', async () => {
  const password = 'CorrectHorse1';
  const hash = await hashPasswordCore(password);

  assert.equal(PASSWORD_HASH_ROUNDS, 12);
  assert.notEqual(hash, password);
  assert.match(hash, bcryptWorkFactorPattern);
  assert.equal(await verifyPasswordCore(password, hash), true);
  assert.equal(await verifyPasswordCore('WrongPassword1', hash), false);
  assert.equal(await verifyPasswordCore(password, null), false);
});

test('auth token digests are deterministic and expiry is exactly 24 hours', () => {
  const now = new Date('2026-07-22T12:00:00.000Z');
  const expiresAt = getAuthTokenExpiry(now);
  const digest = digestAuthToken('raw-secret-token');

  assert.equal(expiresAt.getTime() - now.getTime(), AUTH_TOKEN_TTL_MS);
  assert.equal(AUTH_TOKEN_TTL_MS, 24 * 60 * 60 * 1000);
  assert.equal(digest.length, 64);
  assert.notEqual(digest, 'raw-secret-token');
  assert.equal(
    isAuthTokenFresh(expiresAt, new Date(expiresAt.getTime() - 1)),
    true
  );
  assert.equal(isAuthTokenFresh(expiresAt, expiresAt), false);
});

test('rate-limit keys are secret-keyed and do not retain raw identifiers', () => {
  const first = digestRateLimitKey('127.0.0.1|user@example.com', 'secret-a');
  const second = digestRateLimitKey('127.0.0.1|user@example.com', 'secret-b');

  assert.equal(first.length, 64);
  assert.notEqual(first, second);
  assert.doesNotMatch(first, rawRateLimitDataPattern);
});

test('identity throttles are global while IP throttles stay address-specific', () => {
  const firstIp = getAuthRateLimitKeyDigests({
    discriminator: 'user@example.com',
    ipAddress: '192.0.2.1',
    secret: 'rate-limit-secret',
  });
  const secondIp = getAuthRateLimitKeyDigests({
    discriminator: 'user@example.com',
    ipAddress: '192.0.2.2',
    secret: 'rate-limit-secret',
  });

  assert.equal(firstIp.identityKeyDigest, secondIp.identityKeyDigest);
  assert.notEqual(firstIp.ipKeyDigest, secondIp.ipKeyDigest);
});

test('authentication redirects reject cross-origin and encoded slash variants', () => {
  const origin = 'https://tvsync.app';

  assert.equal(getSafeCallbackUrl('/movies?page=2', origin), '/movies?page=2');
  assert.equal(getSafeCallbackUrl('https://evil.example', origin), '/profile');
  assert.equal(getSafeCallbackUrl('//evil.example', origin), '/profile');
  assert.equal(getSafeCallbackUrl('/%2f%2fevil.example', origin), '/profile');
  assert.equal(
    getSafeCallbackUrl('/%255c%255cevil.example', origin),
    '/profile'
  );
  assert.equal(
    getSafeAuthRedirectUrl('https://evil.example/path', origin),
    origin
  );
});
