import { authOptions } from 'lib/services/auth/index.server';
import { getServerSession } from 'next-auth/next';

export const isTvShowDetailViewerAuthenticated = async () => {
  try {
    return Boolean((await getServerSession(authOptions))?.user?.id);
  } catch {
    return false;
  }
};
