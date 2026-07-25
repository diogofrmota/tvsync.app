/* biome-ignore-all lint/performance/useTopLevelRegex: Contract assertions stay beside the requirement they protect. */
/* biome-ignore-all lint/suspicious/noMisplacedAssertion: Shared helpers are invoked only inside node:test cases. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const listComponentFiles = (directory: string): Array<string> =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return listComponentFiles(path);
    }

    return path.endsWith('.tsx') ? [path] : [];
  });

const isClientModule = (source: string) =>
  source.trimStart().startsWith("'use client'");

/**
 * Chakra UI ships its components with "use client", so handing one of them a
 * component as a prop from a Server Component asks React to serialize a
 * function across the server/client boundary. React refuses, and the whole
 * route renders the error page — which is exactly how the profile and detail
 * pages broke. Server modules render the icon as a child instead.
 */
test('server components never pass a component as a prop to a client component', () => {
  const offenders = listComponentFiles('src').flatMap((path) => {
    const source = readFileSync(path, 'utf8');

    if (isClientModule(source)) {
      return [];
    }

    return [
      ...source.matchAll(/\b(?:as|icon|component)=\{([A-Z][A-Za-z0-9_]*)\}/g),
    ].map((match) => `${path}: ${match[0]}`);
  });

  assert.deepEqual(
    offenders,
    [],
    `Render the component as a child instead:\n${offenders.join('\n')}`
  );
});

test('the shared icons render as children so they survive the server boundary', () => {
  const heart = read('src/lib/components/shared/FavoriteHeart.tsx');
  const rating = read('src/lib/components/shared/MediaRating.tsx');

  assert.doesNotMatch(heart, /^'use client'/);
  assert.doesNotMatch(rating, /^'use client'/);
  assert.match(heart, /<FiHeart fill="currentColor" \/>/);
  assert.match(rating, /<FiStar fill="currentColor" \/>/);
  // The colour still comes from the theme, through the wrapping span.
  assert.match(heart, /color="red\.500"/);
  assert.match(rating, /color="gold\.400"/);
});
