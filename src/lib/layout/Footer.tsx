import { Flex, HStack, Text } from '@chakra-ui/react';
import Link from 'next/link';

const footerLinks = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/contact', label: 'Contact' },
] as const;

const Footer = () => (
  <Flex
    align={{ base: 'flex-start', sm: 'center' }}
    as="footer"
    borderColor="border"
    borderTopWidth="1px"
    direction={{ base: 'column', sm: 'row' }}
    gap={4}
    justify="space-between"
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
      wrap="wrap"
    >
      {footerLinks.map((item) => (
        <Link href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </HStack>
    <Text color="fg.muted" fontSize="sm">
      Copyright &copy; {new Date().getFullYear()} TvSync
    </Text>
  </Flex>
);

export default Footer;
