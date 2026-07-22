import bcrypt from 'bcryptjs';

export const PASSWORD_HASH_ROUNDS = 12;
export const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.zoW8YhN7g8LT2JYH9X1S1lQJZl0xR2';

export const hashPasswordCore = (password: string) =>
  bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

export const verifyPasswordCore = (password: string, hash?: string | null) =>
  bcrypt.compare(password, hash ?? DUMMY_PASSWORD_HASH);
