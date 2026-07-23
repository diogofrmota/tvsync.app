'use client';

import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FiFilm,
  FiHome,
  FiLogIn,
  FiSearch,
  FiTv,
  FiUser,
  FiUserPlus,
} from 'react-icons/fi';

type NavItem = {
  href: Route;
  icon: React.ElementType;
  label: string;
  match: (pathname: string) => boolean;
};

const publicNavItems: Array<NavItem> = [
  { href: '/', icon: FiHome, label: 'Home', match: (path) => path === '/' },
  {
    href: '/register',
    icon: FiUserPlus,
    label: 'Register',
    match: (path) => path.startsWith('/register'),
  },
  {
    href: '/login',
    icon: FiLogIn,
    label: 'Login',
    match: (path) => path.startsWith('/login'),
  },
];

const authenticatedNavItems: Array<NavItem> = [
  {
    href: '/search',
    icon: FiSearch,
    label: 'Explore',
    match: (path) => path.startsWith('/search'),
  },
  {
    href: '/movies',
    icon: FiFilm,
    label: 'Movies',
    match: (path) => path.startsWith('/movies') || path.startsWith('/movie/'),
  },
  {
    href: '/tv-shows',
    icon: FiTv,
    label: 'TV Shows',
    match: (path) => path.startsWith('/tv-shows') || path.startsWith('/tv/'),
  },
  {
    href: '/profile',
    icon: FiUser,
    label: 'Profile',
    match: (path) => path.startsWith('/profile'),
  },
];

const NavLink = ({
  item,
  mobile = false,
}: {
  item: NavItem;
  mobile?: boolean;
}) => {
  const pathname = usePathname();
  const active = item.match(pathname);

  if (mobile) {
    return (
      <VStack
        asChild
        color={active ? 'gold.300' : 'gray.200'}
        flex="1"
        gap={1}
        minWidth={0}
        transitionDuration="fast"
        transitionProperty="color"
        transitionTimingFunction="ease-out"
      >
        <Link aria-current={active ? 'page' : undefined} href={item.href}>
          <Icon aria-hidden as={item.icon} boxSize={5} />
          <Text fontSize="xs" fontWeight={active ? '700' : '500'}>
            {item.label}
          </Text>
        </Link>
      </VStack>
    );
  }

  return (
    <Box
      _after={{
        background: active ? 'gold.300' : 'transparent',
        borderRadius: 'full',
        bottom: '-0.4rem',
        content: '""',
        height: '2px',
        left: 0,
        position: 'absolute',
        right: 0,
        transitionDuration: 'moderate',
        transitionProperty: 'background',
        transitionTimingFunction: 'ease-out',
      }}
      _focusVisible={{
        outline: '3px solid',
        outlineColor: 'gold.400',
        outlineOffset: '3px',
      }}
      _hover={{ color: 'fg' }}
      asChild
      color={active ? 'fg' : 'gray.100'}
      fontWeight={active ? '700' : '500'}
      position="relative"
      transitionDuration="fast"
      transitionProperty="color"
      transitionTimingFunction="ease-out"
    >
      <Link aria-current={active ? 'page' : undefined} href={item.href}>
        {item.label}
      </Link>
    </Box>
  );
};

const Header = () => {
  const { data: session, status } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const items = isAuthenticated ? authenticatedNavItems : publicNavItems;

  return (
    <>
      <Box
        as="header"
        borderBottomWidth="1px"
        borderColor="border"
        width="full"
      >
        <Flex
          align="center"
          gap={{ base: 6, md: 10 }}
          height={{ base: '4rem', md: '4.5rem' }}
          justify="center"
          marginX="auto"
          maxWidth="80rem"
          paddingX={{ base: 4, sm: 6, lg: 8 }}
        >
          <Heading asChild fontSize={{ base: '2xl', md: '3xl' }}>
            <Link href={isAuthenticated ? '/movies' : '/'}>
              Tv
              <Text as="span" color="gold.400">
                Sync
              </Text>
            </Link>
          </Heading>
          {status === 'loading' ? null : (
            <HStack
              aria-label="Primary navigation"
              as="nav"
              display={isAuthenticated ? { base: 'none', md: 'flex' } : 'flex'}
              fontSize={{ base: 'md', md: 'lg' }}
              gap={{ base: 4, sm: 6 }}
            >
              {items.map((item) => (
                <NavLink item={item} key={item.href} />
              ))}
            </HStack>
          )}
        </Flex>
      </Box>

      {isAuthenticated && status !== 'loading' ? (
        <Box
          aria-label="Primary navigation"
          as="nav"
          background="bg"
          borderColor="border"
          borderTopWidth="1px"
          bottom={0}
          display={{ base: 'block', md: 'none' }}
          left={0}
          paddingBottom="env(safe-area-inset-bottom)"
          position="fixed"
          right={0}
          zIndex={20}
        >
          <HStack gap={0} minHeight="4rem" paddingX={1}>
            {items.map((item) => (
              <NavLink item={item} key={item.href} mobile />
            ))}
          </HStack>
        </Box>
      ) : null}
    </>
  );
};

export default Header;
