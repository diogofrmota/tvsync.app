import { authOptions } from 'lib/services/auth/index.server';
import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
