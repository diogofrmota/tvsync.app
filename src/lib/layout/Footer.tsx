import { Flex, Grid, Link, Text } from '@chakra-ui/react';
import Image from 'next/image';

const Footer = () => {
  return (
    <Flex align="center" as="footer" padding="8" width="full">
      <Text fontSize="sm">
        2026 -{' '}
        <Link
          fontWeight="bold"
          href="https://github.com/diogofrmota/tvsync.app"
          rel="noopener noreferrer"
          target="_blank"
        >
          TVSync
        </Link>
      </Text>

      <Grid gap={1} marginLeft="auto" textAlign="right">
        <Text fontSize="0.6rem" textTransform="lowercase">
          Powered by
        </Text>
        <Link
          href="https://themoviedb.org"
          rel="noopener noreferrer"
          target="_blank"
        >
          <Image alt="tmdb" height="20" src="/tmdb.svg" width="50" />
        </Link>
      </Grid>
    </Flex>
  );
};

export default Footer;
