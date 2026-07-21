'use client';

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react';
import { trackEvent } from 'lib/utils/track-event';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiHome, FiLogIn, FiMonitor, FiUser, FiUserPlus } from 'react-icons/fi';
import { MdLocalMovies } from 'react-icons/md';

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: React.ElementType;
};

const publicNavItems: Array<NavItem> = [
  {
    href: '/',
    label: 'Home',
    match: (pathname) => pathname === '/',
    icon: FiHome,
  },
  {
    href: '/movies',
    label: 'Movies',
    match: (pathname) =>
      pathname.startsWith('/movies') || pathname.startsWith('/movie/'),
    icon: MdLocalMovies,
  },
  {
    href: '/tv-shows',
    label: 'TV Shows',
    match: (pathname) =>
      pathname.startsWith('/tv-shows') || pathname.startsWith('/tv/'),
    icon: FiMonitor,
  },
  {
    href: '/login',
    label: 'Login',
    match: (pathname) => pathname.startsWith('/login'),
    icon: FiLogIn,
  },
  {
    href: '/register',
    label: 'Register',
    match: (pathname) => pathname.startsWith('/register'),
    icon: FiUserPlus,
  },
];

const authenticatedNavItems: Array<NavItem> = [
  {
    href: '/',
    label: 'Home',
    match: (pathname) => pathname === '/',
    icon: FiHome,
  },
  {
    href: '/movies',
    label: 'Movies',
    match: (pathname) =>
      pathname.startsWith('/movies') || pathname.startsWith('/movie/'),
    icon: MdLocalMovies,
  },
  {
    href: '/tv-shows',
    label: 'TV Shows',
    match: (pathname) =>
      pathname.startsWith('/tv-shows') || pathname.startsWith('/tv/'),
    icon: FiMonitor,
  },
  {
    href: '/profile',
    label: 'Profile',
    match: (pathname) => pathname.startsWith('/profile'),
    icon: FiUser,
  },
];

const Header = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const isLoadingSession = status === 'loading';
  const navItems =
    isAuthenticated && !isLoadingSession
      ? authenticatedNavItems
      : publicNavItems;

  const handleClickNav = (label: string) => {
    trackEvent({
      eventName: `Nav Link: ${label}`,
      eventData: { type: 'navigate' },
    });
  };

  const renderDesktopLink = (item: NavItem) => {
    const isActive = item.match(pathname);

    return (
      <Button
        asChild
        fontWeight={isActive ? 'bold' : 'medium'}
        key={item.href}
        onClick={() => handleClickNav(item.label)}
        size="sm"
        variant={isActive ? 'solid' : 'ghost'}
      >
        <Link href={item.href as Route}>{item.label}</Link>
      </Button>
    );
  };

  const renderMobileLink = (item: NavItem) => {
    const isActive = item.match(pathname);

    return (
      <VStack
        asChild
        color={isActive ? 'teal.500' : 'fg.muted'}
        flex="1"
        gap={1}
        key={item.href}
        minWidth={0}
        onClick={() => handleClickNav(item.label)}
      >
        <Link href={item.href as Route}>
          <Icon aria-hidden="true" as={item.icon} boxSize={5} />
          <Text
            fontSize="0.65rem"
            fontWeight={isActive ? 'bold' : 'medium'}
            lineHeight="1"
            maxWidth="100%"
            textAlign="center"
            wordBreak="break-word"
          >
            {item.label}
          </Text>
        </Link>
      </VStack>
    );
  };

  return (
    <>
      <Flex
        align="center"
        as="header"
        justify="center"
        padding={[4, 8]}
        position="relative"
        width="full"
      >
        <Box left={[4, 8]} position="absolute">
          <Heading asChild fontSize={['xl', '2xl']}>
            <Link href="/">TVSync</Link>
          </Heading>
        </Box>

        <HStack display={['none', 'none', 'flex']} gap={1} role="navigation">
          {navItems.map(renderDesktopLink)}
        </HStack>
      </Flex>

      <Box
        as="nav"
        background="bg"
        borderTopWidth="1px"
        bottom={0}
        display={['block', 'block', 'none']}
        left={0}
        paddingBottom="env(safe-area-inset-bottom)"
        position="fixed"
        right={0}
        zIndex={10}
      >
        <HStack gap={0} minHeight="64px" paddingX={1}>
          {navItems.map(renderMobileLink)}
        </HStack>
      </Box>
    </>
  );
};

export default Header;
