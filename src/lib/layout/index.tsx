import { Box } from '@chakra-ui/react';

import Footer from './Footer';
import Header from './Header';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <Box minHeight="100vh" transition="0.5s ease-out">
      <Box margin="0 auto" maxWidth="96rem" width="100%">
        <Header />
        <Box as="main" marginY={22} paddingBottom={[20, 20, 0]}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
};

export default Layout;
