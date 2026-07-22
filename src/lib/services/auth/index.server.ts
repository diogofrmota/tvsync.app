import 'server-only';

import { getSafeAuthRedirectUrl } from 'lib/services/auth/callback-url';
import { EMAIL_UNVERIFIED_ERROR } from 'lib/services/auth/constants';
import { verifyPassword } from 'lib/services/auth/password.server';
import {
  checkAuthRateLimit,
  getClientIp,
} from 'lib/services/auth/rate-limit.server';
import {
  normalizeEmail,
  normalizeLoginIdentifier,
  validatePassword,
} from 'lib/services/auth/security';
import {
  AuthAccountConflictError,
  ensureGoogleAuthIdentity,
  findCredentialAccount,
  getSessionVersion,
} from 'lib/services/database/auth.server';
import type { NextAuthOptions, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

type TvsyncJwt = JWT & {
  sessionInvalidated?: boolean;
  sessionVersion?: number;
};

type GoogleProfile = {
  email?: unknown;
  email_verified?: unknown;
};

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    credentials: {
      identifier: { label: 'Email address or username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    name: 'Email and password',
    async authorize(credentials, request) {
      const identifier = normalizeLoginIdentifier(
        typeof credentials?.identifier === 'string'
          ? credentials.identifier.slice(0, 254)
          : ''
      );
      const password =
        typeof credentials?.password === 'string' ? credentials.password : '';
      const withinLimit = await checkAuthRateLimit({
        discriminator: identifier || 'missing',
        ipAddress: getClientIp(request.headers),
        rule: 'login',
      });
      const passwordIsWellFormed = !validatePassword(password);
      const account =
        withinLimit && identifier && passwordIsWellFormed
          ? await findCredentialAccount(identifier)
          : null;
      const passwordMatches = await verifyPassword(
        passwordIsWellFormed ? password : 'invalid-password-1',
        account?.password_hash
      );

      if (!(withinLimit && account && passwordMatches)) {
        return null;
      }

      if (!account.email_verified_at) {
        throw new Error(EMAIL_UNVERIFIED_ERROR);
      }

      return {
        email: account.email,
        id: account.user_id,
        name: account.name,
        sessionVersion: account.session_version,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

const isVerifiedGoogleProfile = (profile: unknown): profile is GoogleProfile =>
  Boolean(
    profile &&
      typeof profile === 'object' &&
      'email' in profile &&
      typeof (profile as GoogleProfile).email === 'string' &&
      (profile as GoogleProfile).email_verified === true
  );

const invalidateToken = (token: TvsyncJwt) => {
  token.email = undefined;
  token.name = undefined;
  token.picture = undefined;
  token.sessionInvalidated = true;
  token.sub = undefined;

  return token;
};

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.AUTH_SECRET,
  pages: {
    error: '/login',
    signIn: '/login',
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== 'google') {
        return true;
      }

      if (!(account.providerAccountId && isVerifiedGoogleProfile(profile))) {
        return '/login?error=AccessDenied';
      }

      try {
        const userId = await ensureGoogleAuthIdentity({
          email: normalizeEmail(profile.email as string),
          name: user.name,
          providerAccountId: account.providerAccountId,
        });
        const sessionVersion = await getSessionVersion(userId);

        user.id = userId;
        (user as User).sessionVersion = sessionVersion ?? 0;
        return true;
      } catch (error) {
        return error instanceof AuthAccountConflictError
          ? '/login?error=OAuthAccountNotLinked'
          : '/login?error=AccessDenied';
      }
    },
    async jwt({ token, user }) {
      const tvsyncToken = token as TvsyncJwt;

      if (user) {
        tvsyncToken.sessionInvalidated = false;
        tvsyncToken.sessionVersion = user.sessionVersion ?? 0;
        tvsyncToken.sub = user.id;
        return tvsyncToken;
      }

      if (!tvsyncToken.sub || tvsyncToken.sessionInvalidated) {
        return tvsyncToken;
      }

      const currentSessionVersion = await getSessionVersion(tvsyncToken.sub);

      if (
        currentSessionVersion === null ||
        currentSessionVersion !== tvsyncToken.sessionVersion
      ) {
        return invalidateToken(tvsyncToken);
      }

      return tvsyncToken;
    },
    redirect({ baseUrl, url }) {
      return getSafeAuthRedirectUrl(url, baseUrl);
    },
    session({ session, token }) {
      const tvsyncToken = token as TvsyncJwt;

      if (session.user && tvsyncToken.sub && !tvsyncToken.sessionInvalidated) {
        session.user.id = tvsyncToken.sub;
      } else {
        session.user = undefined;
      }

      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
};
