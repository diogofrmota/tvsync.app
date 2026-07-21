import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(__dirname, '..');
const migrationsDirectory = path.join(rootDirectory, 'database', 'migrations');
const envLocalPath = path.join(rootDirectory, '.env.local');
const envLineRegex = /^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/i;
const lineBreakRegex = /\r?\n/;
const recordExistingMigrations = process.argv.includes('--record-existing');

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: SQL splitting needs to track quote and comment state.
const splitSqlStatements = (sqlText) => {
  const statements = [];
  let currentStatement = '';
  let inBlockComment = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inSingleQuote = false;

  for (let index = 0; index < sqlText.length; index += 1) {
    const character = sqlText[index];
    const nextCharacter = sqlText[index + 1];

    if (inLineComment) {
      currentStatement += character;

      if (character === '\n') {
        inLineComment = false;
      }

      continue;
    }

    if (inBlockComment) {
      currentStatement += character;

      if (character === '*' && nextCharacter === '/') {
        currentStatement += nextCharacter;
        index += 1;
        inBlockComment = false;
      }

      continue;
    }

    if (inSingleQuote) {
      currentStatement += character;

      if (character === "'" && nextCharacter === "'") {
        currentStatement += nextCharacter;
        index += 1;
        continue;
      }

      if (character === "'") {
        inSingleQuote = false;
      }

      continue;
    }

    if (inDoubleQuote) {
      currentStatement += character;

      if (character === '"' && nextCharacter === '"') {
        currentStatement += nextCharacter;
        index += 1;
        continue;
      }

      if (character === '"') {
        inDoubleQuote = false;
      }

      continue;
    }

    if (character === '-' && nextCharacter === '-') {
      currentStatement += character + nextCharacter;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      currentStatement += character + nextCharacter;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (character === "'") {
      currentStatement += character;
      inSingleQuote = true;
      continue;
    }

    if (character === '"') {
      currentStatement += character;
      inDoubleQuote = true;
      continue;
    }

    if (character === ';') {
      const statement = currentStatement.trim();

      if (statement) {
        statements.push(statement);
      }

      currentStatement = '';
      continue;
    }

    currentStatement += character;
  }

  const finalStatement = currentStatement.trim();

  if (finalStatement) {
    statements.push(finalStatement);
  }

  return statements;
};

const parseEnvValue = (value) => {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
};

const loadLocalEnvironment = () => {
  if (!existsSync(envLocalPath)) {
    return;
  }

  const envFile = readFileSync(envLocalPath, 'utf8');

  for (const line of envFile.split(lineBreakRegex)) {
    const match = line.match(envLineRegex);

    if (!match) {
      continue;
    }

    const [, key, value] = match;

    if (process.env[key]) {
      continue;
    }

    process.env[key] = parseEnvValue(value);
  }
};

const getMigrationFiles = async () => {
  const files = await readdir(migrationsDirectory);

  return files.filter((file) => file.endsWith('.sql')).sort();
};

const ensureMigrationHistoryTable = async (sql) => {
  await sql.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
};

const getAppliedMigrationNames = async (sql) => {
  const rows = await sql.query('select name from schema_migrations');

  return new Set(rows.map((row) => row.name));
};

const recordMigration = async (sql, migrationFile) => {
  await sql`
    insert into schema_migrations (name)
    values (${migrationFile})
    on conflict (name) do nothing
  `;
};

const run = async () => {
  loadLocalEnvironment();

  const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

  if (!databaseUrl) {
    throw new Error(
      'Missing DATABASE_URL_UNPOOLED. Add the Neon unpooled connection string to .env.local or set it in the shell before running migrations.'
    );
  }

  const sql = neon(databaseUrl);
  const migrationFiles = await getMigrationFiles();
  await ensureMigrationHistoryTable(sql);
  const appliedMigrationNames = await getAppliedMigrationNames(sql);

  if (recordExistingMigrations) {
    let recordedMigrationCount = 0;

    for (const migrationFile of migrationFiles) {
      if (appliedMigrationNames.has(migrationFile)) {
        continue;
      }

      await recordMigration(sql, migrationFile);
      recordedMigrationCount += 1;
    }

    process.stdout.write(
      `Recorded ${recordedMigrationCount} existing migration(s).\n`
    );
    return;
  }

  let appliedMigrationCount = 0;

  for (const migrationFile of migrationFiles) {
    if (appliedMigrationNames.has(migrationFile)) {
      process.stdout.write(`Skipping ${migrationFile}... already applied\n`);
      continue;
    }

    const migrationPath = path.join(migrationsDirectory, migrationFile);
    const migrationSql = readFileSync(migrationPath, 'utf8');
    const statements = splitSqlStatements(migrationSql);

    process.stdout.write(`Applying ${migrationFile}... `);
    for (const statement of statements) {
      await sql.query(statement);
    }
    await recordMigration(sql, migrationFile);
    appliedMigrationCount += 1;
    process.stdout.write('done\n');
  }

  process.stdout.write(`Applied ${appliedMigrationCount} migration(s).\n`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
