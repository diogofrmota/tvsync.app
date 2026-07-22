/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirements they guard. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are called only inside node:test cases. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

import {
  CONTACT_FIELD_LIMITS,
  CONTACT_MIN_SUBMISSION_MS,
  isHoneypotFilled,
  isLikelySpamSubmission,
  isSubmittedTooFast,
  normalizeContactEmail,
  validateContactSubmission,
} from '../src/lib/services/contact/security';
import { CONSUME_AUTH_RATE_LIMIT_QUERY } from '../src/lib/services/database/auth-queries';
import { escapeHtml } from '../src/lib/utils/html';

const read = (path: string) => readFile(join(process.cwd(), path), 'utf8');
const flatten = (text: string) => text.replace(/\s+/g, ' ');

const runMigration = async (db: PGliteInterface, name: string) => {
  await db.exec(await read(join('database', 'migrations', name)));
};

const consumeRateLimit = async (
  db: PGliteInterface,
  scope: string,
  keyDigest: string,
  windowSeconds: number
) => {
  const result = await db.query<{ attempt_count: number }>(
    CONSUME_AUTH_RATE_LIMIT_QUERY,
    [scope, keyDigest, windowSeconds]
  );

  return result.rows.at(0)?.attempt_count ?? 0;
};

test('footer exposes exactly Privacy Policy, Terms of Service, and Contact, in order', async () => {
  const footer = await read('src/lib/layout/Footer.tsx');
  const linkMatches = Array.from(
    footer.matchAll(/href:\s*'([^']+)',\s*label:\s*'([^']+)'/g)
  );

  assert.deepEqual(
    linkMatches.map((match) => [match[1], match[2]]),
    [
      ['/privacy', 'Privacy Policy'],
      ['/terms', 'Terms of Service'],
      ['/contact', 'Contact'],
    ]
  );
  assert.match(footer, /Copyright/);
  assert.match(footer, /direction=\{\{ base: 'column', sm: 'row' \}\}/);
});

test('footer only renders for the signed-out public shell, never the authenticated shell', async () => {
  const layout = await read('src/lib/layout/index.tsx');

  assert.match(layout, /status === 'unauthenticated' \? <Footer \/> : null/);
});

test('privacy policy covers every UX.md 4.1 topic and describes only real integrations', async () => {
  const page = await read('src/app/privacy/page.tsx');

  assert.match(page, /Information we collect/);
  assert.match(page, /How we use your information/);
  assert.match(page, /How authentication data is protected/i);
  assert.match(page, /External services that process data/i);
  assert.match(page, /Requesting your data/i);
  assert.match(page, /Deleting your data/i);
  assert.match(page, /Cookies/);
  assert.match(page, /Contact/);

  // Real integrations only.
  assert.match(page, /Neon/);
  assert.match(page, /Resend/);
  assert.match(page, /TMDB/);
  assert.match(page, /Vercel/);
  assert.match(page, /Google/);
  assert.match(page, /bcrypt/);

  // No fabricated certifications, legal bases, or retention guarantees.
  assert.doesNotMatch(
    page,
    /GDPR-compliant|SOC ?2|ISO 27001|HIPAA|PCI[- ]DSS/i
  );
  assert.doesNotMatch(page, /we guarantee|fully encrypted at all times/i);
  assert.match(page, /Legal review/);
  assert.match(flatten(page), /requires? owner or legal review/i);
});

test('terms of service covers every UX.md 4.2 topic and flags legal placeholders', async () => {
  const page = await read('src/app/terms/page.tsx');

  assert.match(page, /Account responsibilities/);
  assert.match(page, /Acceptable use/);
  assert.match(page, /Content ownership/);
  assert.match(page, /Service availability/);
  assert.match(page, /Account suspension or termination/);
  assert.match(page, /Limitation of liability/);
  assert.match(page, /Changes to these terms/);
  assert.match(page, /Contact/);

  // Do not invent a legal entity, address, or governing law.
  assert.doesNotMatch(page, /Delaware|State of|Inc\.|LLC|Ltd\./);
  assert.match(page, /Legal review/);
  assert.match(page, /governing law/i);
});

test('contact page renders exactly Name, Email, Subject, Message, and Send Message', async () => {
  const form = await read('src/lib/pages/contact/contact-form.tsx');

  assert.match(form, /Field\.Label>Name</);
  assert.match(form, /Field\.Label>Email address</);
  assert.match(form, /Field\.Label>Subject</);
  assert.match(form, /Field\.Label>Message</);
  assert.match(form, />\s*Send Message\s*</);
});

test('contact form wires required-field, email, and length-limit validation', async () => {
  const form = await read('src/lib/pages/contact/contact-form.tsx');

  assert.match(form, /name="name"[\s\S]*?required/);
  assert.match(form, /name="email"[\s\S]*?required[\s\S]*?type="email"/);
  assert.match(form, /type="email"/);
  assert.match(form, /maxLength=\{CONTACT_FIELD_LIMITS\.name\}/);
  assert.match(form, /maxLength=\{CONTACT_FIELD_LIMITS\.email\}/);
  assert.match(form, /maxLength=\{CONTACT_FIELD_LIMITS\.subject\}/);
  assert.match(form, /maxLength=\{CONTACT_FIELD_LIMITS\.message\}/);
});

test('contact form shows a success confirmation and a safe generic failure message', async () => {
  const form = await read('src/lib/pages/contact/contact-form.tsx');
  const actions = await read('src/lib/features/contact/actions.ts');

  assert.match(form, /Message sent/);
  assert.match(form, /Your message has been sent/);
  assert.match(actions, /GENERIC_FAILURE_MESSAGE/);
  assert.match(
    actions,
    /could not send your message right now\. Please try again/i
  );
  // The generic failure message must never leak provider/database specifics.
  assert.doesNotMatch(actions, /Resend could not deliver/);
  assert.doesNotMatch(actions, /DATABASE_URL/);
});

test('contact form includes a honeypot field and a render-to-submit timing check', async () => {
  const form = await read('src/lib/pages/contact/contact-form.tsx');
  const actions = await read('src/lib/features/contact/actions.ts');
  const security = await read('src/lib/services/contact/security.ts');

  assert.match(form, /name="company"/);
  assert.match(form, /aria-hidden="true"/);
  assert.match(form, /tabIndex=\{-1\}/);
  assert.match(form, /name="renderedAt"/);
  assert.match(actions, /isLikelySpamSubmission/);
  assert.match(security, /isHoneypotFilled/);
  assert.match(security, /isSubmittedTooFast/);
});

test('contact submission is rate limited and deduplicated server-side through the shared Neon rate-limit table', async () => {
  const actions = await read('src/lib/features/contact/actions.ts');
  const rateLimit = await read('src/lib/services/contact/rate-limit.server.ts');

  assert.match(actions, /checkContactRateLimit/);
  assert.match(actions, /isDuplicateContactSubmission/);
  assert.match(rateLimit, /consumeAuthRateLimit/);
  assert.match(rateLimit, /scope: 'contact:identity'/);
  assert.match(rateLimit, /scope: 'contact:ip'/);
  assert.match(rateLimit, /scope: 'contact:dedupe'/);
  assert.match(rateLimit, /limit: 1/);
});

test('contact email delivery escapes user content and reads destination/credentials only from environment variables', async () => {
  const email = await read('src/lib/services/contact/email.server.ts');

  assert.match(email, /escapeHtml/);
  assert.match(email, /process\.env\.RESEND_API_KEY/);
  assert.match(email, /process\.env\.CONTACT_EMAIL_TO/);
  assert.match(email, /process\.env\.CONTACT_EMAIL_FROM/);
  assert.doesNotMatch(email, /re_[A-Za-z0-9]{10,}/);
  assert.doesNotMatch(email, /console\.(log|warn|error)/);
});

test('legal and contact pages use the shared narrow shell for consistent mobile/desktop layout', async () => {
  const legal = await read('src/lib/pages/legal/index.tsx');
  const contactPage = await read('src/app/contact/page.tsx');
  const shell = await read('src/lib/components/shared/PageShell.tsx');

  assert.match(legal, /size="narrow"/);
  assert.match(contactPage, /size="narrow"/);
  assert.match(
    shell,
    /maxWidth\(size === 'narrow' \? '48rem' : '80rem'\)|48rem/
  );
  assert.match(shell, /paddingX=\{pagePaddingX\}/);
});

test('contact validation enforces required fields, valid email, and length limits', () => {
  const missing = validateContactSubmission({
    email: '',
    message: '',
    name: '',
    subject: '',
  });
  assert.equal(missing.fieldErrors.name, 'Enter your name.');
  assert.equal(missing.fieldErrors.email, 'Enter your email address.');
  assert.equal(missing.fieldErrors.subject, 'Enter a subject.');
  assert.equal(missing.fieldErrors.message, 'Enter a message.');

  const invalidEmail = validateContactSubmission({
    email: 'not-an-email',
    message: 'A valid enough message body.',
    name: 'Alex',
    subject: 'Hello',
  });
  assert.equal(invalidEmail.fieldErrors.email, 'Enter a valid email address.');

  const tooLong = validateContactSubmission({
    email: 'user@example.com',
    message: 'x'.repeat(CONTACT_FIELD_LIMITS.message + 1),
    name: 'x'.repeat(CONTACT_FIELD_LIMITS.name + 1),
    subject: 'x'.repeat(CONTACT_FIELD_LIMITS.subject + 1),
  });
  assert.ok(tooLong.fieldErrors.name);
  assert.ok(tooLong.fieldErrors.subject);
  assert.ok(tooLong.fieldErrors.message);

  const tooShortMessage = validateContactSubmission({
    email: 'user@example.com',
    message: 'short',
    name: 'Alex',
    subject: 'Hello',
  });
  assert.ok(tooShortMessage.fieldErrors.message);

  const valid = validateContactSubmission({
    email: '  Person@Example.com  ',
    message: 'This is a perfectly valid message body.',
    name: '  Alex Doe  ',
    subject: 'Question about my account',
  });
  assert.deepEqual(valid.fieldErrors, {});
  assert.equal(valid.value.email, 'person@example.com');
  assert.equal(valid.value.name, 'Alex Doe');
  assert.equal(
    normalizeContactEmail('  USER@Example.COM '),
    'user@example.com'
  );
});

test('spam heuristics catch a filled honeypot and an implausibly fast submission', () => {
  assert.equal(isHoneypotFilled(''), false);
  assert.equal(isHoneypotFilled('   '), false);
  assert.equal(isHoneypotFilled('acme corp'), true);

  const renderedAtMs = 1000;
  assert.equal(
    isSubmittedTooFast(
      renderedAtMs,
      renderedAtMs + CONTACT_MIN_SUBMISSION_MS - 1
    ),
    true
  );
  assert.equal(
    isSubmittedTooFast(renderedAtMs, renderedAtMs + CONTACT_MIN_SUBMISSION_MS),
    false
  );

  assert.equal(
    isLikelySpamSubmission({
      honeypot: '',
      renderedAtMs,
      submittedAtMs: renderedAtMs + CONTACT_MIN_SUBMISSION_MS + 500,
    }),
    false
  );
  assert.equal(
    isLikelySpamSubmission({
      honeypot: 'bot filled this',
      renderedAtMs,
      submittedAtMs: renderedAtMs + 5000,
    }),
    true
  );
  assert.equal(
    isLikelySpamSubmission({
      honeypot: '',
      renderedAtMs,
      submittedAtMs: renderedAtMs + 1,
    }),
    true
  );
});

test('contact HTML email content is escaped against injected markup', () => {
  const malicious = '<img src=x onerror=alert(1)>"quoted" & \'single\'';
  const escaped = escapeHtml(malicious);

  assert.doesNotMatch(escaped, /<img/);
  assert.match(escaped, /&lt;img/);
  assert.match(escaped, /&quot;quoted&quot;/);
  assert.match(escaped, /&#39;single&#39;/);
  assert.match(escaped, /&amp;/);
});

// biome-ignore lint/style/noDoneCallback: Node's test context provides awaited subtests, not a completion callback.
test('the shared Neon rate-limit table enforces per-scope submission limits and short-window deduplication', async (t) => {
  const db = await PGlite.create({ extensions: { pgcrypto } });

  try {
    for (const migrationName of [
      '0001_initial_tracking_schema.sql',
      '0002_watch_status_values.sql',
      '0003_ratings_reviews_targets.sql',
      '0004_social_activity_recommendations.sql',
      '0005_auth_lifecycle.sql',
    ]) {
      await runMigration(db, migrationName);
    }

    await t.test('allows submissions within the configured limit', async () => {
      const scope = 'contact:identity';
      const keyDigest = 'a'.repeat(64);
      const counts = [] as Array<number>;

      for (let index = 0; index < 5; index += 1) {
        counts.push(await consumeRateLimit(db, scope, keyDigest, 3600));
      }

      assert.deepEqual(counts, [1, 2, 3, 4, 5]);
    });

    await t.test(
      'isolates limits by scope so contact never shares auth counters',
      async () => {
        const keyDigest = 'b'.repeat(64);
        const contactCount = await consumeRateLimit(
          db,
          'contact:ip',
          keyDigest,
          3600
        );
        const authCount = await consumeRateLimit(
          db,
          'register:identity',
          keyDigest,
          3600
        );

        assert.equal(contactCount, 1);
        assert.equal(authCount, 1);
      }
    );

    await t.test(
      'a duplicate submission digest is blocked within the dedupe window',
      async () => {
        const scope = 'contact:dedupe';
        const keyDigest = 'c'.repeat(64);
        const first = await consumeRateLimit(db, scope, keyDigest, 600);
        const second = await consumeRateLimit(db, scope, keyDigest, 600);

        assert.equal(first, 1);
        assert.equal(second, 2);
        // A caller enforcing limit=1 treats attempt_count > 1 as a duplicate resubmission.
        assert.ok(second > 1);
      }
    );
  } finally {
    await db.close();
  }
});
