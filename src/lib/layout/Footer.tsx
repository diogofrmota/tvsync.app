import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import Link from 'next/link';

const footerLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact' },
] as const;

const Footer = () => (
  <Flex
    align="center"
    as="footer"
    borderColor="border"
    borderTopWidth="1px"
    direction="column"
    gap={4}
    justify="center"
    marginX="auto"
    maxWidth="80rem"
    paddingX={{ base: 4, sm: 6, lg: 8 }}
    paddingY={6}
    width="full"
  >
    <HStack
      aria-label="Footer navigation"
      as="nav"
      gap={{ base: 3, sm: 5 }}
      justify="center"
      wrap="wrap"
    >
      {footerLinks.map((item) => (
        <Box
          _hover={{ color: 'gold.300' }}
          asChild
          color="fg.muted"
          fontSize="sm"
          fontWeight="500"
          key={item.href}
          transitionDuration="fast"
          transitionProperty="color"
          transitionTimingFunction="ease-out"
        >
          <Link href={item.href}>{item.label}</Link>
        </Box>
      ))}
    </HStack>
    <Text color="fg.muted" fontSize="sm">
      Copyright &copy; {new Date().getFullYear()} TvSync
    </Text>
  </Flex>
);

export default Footer;
