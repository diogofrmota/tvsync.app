import { getAuthSession } from 'lib/services/auth/session.server';

export const isMovieDetailViewerAuthenticated = async () => {
  try {
    return Boolean((await getAuthSession())?.user?.id);
  } catch {
    return false;
  }
};
