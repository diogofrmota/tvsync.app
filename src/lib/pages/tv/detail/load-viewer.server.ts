import { getAuthSession } from 'lib/services/auth/session.server';

export const isTvShowDetailViewerAuthenticated = async () => {
  try {
    return Boolean((await getAuthSession())?.user?.id);
  } catch {
    return false;
  }
};
