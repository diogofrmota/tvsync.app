import 'server-only';

import { getSafeAuthRedirectUrl } from 'lib/services/auth/callback-url';
import { ensureAuthProfile } from 'lib/services/database/auth.server';
import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';

const providers: NextAuthOptions['providers'] = [];

type TvsyncJwt = JWT & {
  profileUserIdResolved?: boolean;
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    signIn() {
      return true;
    },
    async jwt({ account, token, user }) {
      const tvsyncToken = token as TvsyncJwt;
      const userId = account?.providerAccountId ?? tvsyncToken.sub ?? user?.id;
      let resolvedUserId = userId;
      const shouldResolveProfileUserId = Boolean(
        userId &&
          (user || (tvsyncToken.email && !tvsyncToken.profileUserIdResolved))
      );

      if (shouldResolveProfileUserId && userId) {
        try {
          resolvedUserId = await ensureAuthProfile({
            email: user?.email ?? tvsyncToken.email,
            name: user?.name ?? tvsyncToken.name,
            userId,
          });
          tvsyncToken.profileUserIdResolved = true;
        } catch (error) {
          console.warn('Google sign-in succeeded, but profile setup failed.', {
            cause: error,
            userId,
          });
        }
      }

      if (resolvedUserId) {
        tvsyncToken.sub = resolvedUserId;
      }

      return tvsyncToken;
    },
    redirect({ baseUrl, url }) {
      return getSafeAuthRedirectUrl(url, baseUrl);
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
};
