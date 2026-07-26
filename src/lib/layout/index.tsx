'use client';

import { Box, Flex } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import Footer from './Footer';
import Header from './Header';

// Routes rendered without the app shell: the credential pages and the admin
// dashboard, which is not part of the signed-in user experience at all.
const authRoutes = new Set([
  '/admin',
  '/forgot-password',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/verify-email-change',
]);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthPage = authRoutes.has(pathname);
  const isAuthenticated = Boolean(session?.user);

  if (isAuthPage) {
    return (
      <Flex as="main" background="bg" minHeight="100dvh">
        {children}
      </Flex>
    );
  }

  return (
    <Flex direction="column" minHeight="100dvh">
      <Header />
      <Box
        as="main"
        flex="1"
        paddingBottom={isAuthenticated ? { base: 20, md: 0 } : 0}
      >
        {children}
      </Box>
      {status === 'unauthenticated' ? <Footer /> : null}
    </Flex>
  );
};

export default Layout;
