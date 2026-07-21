import 'server-only';

import { getDatabaseSql } from './core.server';

type AuthProfileInput = {
  email?: string | null;
  name?: string | null;
  userId: string;
};

const normalizeProfileText = (value: string | null | undefined) =>
  value?.trim() || 'TVSync User';

const createUsername = ({ email, name, userId }: AuthProfileInput) => {
  const preferredName = email?.split('@').at(0) ?? name ?? 'tvsync';
  const normalizedName = preferredName
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  const suffix = userId.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8);

  return `${normalizedName || 'tvsync'}_${suffix || 'user'}`;
};

export const ensureAuthProfile = async (input: AuthProfileInput) => {
  if (!(input.email && input.userId && process.env.DATABASE_URL)) {
    return input.userId;
  }

  const sql = getDatabaseSql();
  const displayName = normalizeProfileText(input.name);
  const username = createUsername(input);
  const existingEmailRows = (await sql`
    select user_id
    from profiles
    where lower(email) = lower(${input.email})
    limit 1
  `) as Array<{ user_id: string }>;
  const existingEmailUserId = existingEmailRows.at(0)?.user_id;

  if (existingEmailUserId) {
    const rows = (await sql`
      update profiles
      set
        name = ${displayName},
        email = ${input.email},
        updated_at = now()
      where user_id = ${existingEmailUserId}
      returning user_id
    `) as Array<{ user_id: string }>;

    return rows.at(0)?.user_id ?? existingEmailUserId;
  }

  try {
    const rows = (await sql`
      insert into profiles (
        user_id,
        name,
        username,
        display_name,
        email,
        privacy_setting
      )
      values (
        ${input.userId},
        ${displayName},
        ${username},
        ${displayName},
        ${input.email},
        'private'
      )
      on conflict (user_id) do update set
        name = excluded.name,
        email = excluded.email,
        updated_at = now()
      returning user_id
    `) as Array<{ user_id: string }>;

    return rows.at(0)?.user_id ?? input.userId;
  } catch (error) {
    if (!String(error).includes('profiles_email_lower_unique')) {
      throw error;
    }

    const rows = (await sql`
      select user_id
      from profiles
      where lower(email) = lower(${input.email})
      limit 1
    `) as Array<{ user_id: string }>;

    return rows.at(0)?.user_id ?? input.userId;
  }
};
