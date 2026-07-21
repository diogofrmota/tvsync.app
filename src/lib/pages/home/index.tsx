import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/PosterImage';
import type { DashboardData } from 'lib/features/dashboard';
import { WatchlistButton } from 'lib/features/watchlist';
import type { MediaOverviewItem } from 'lib/pages/media/overview';
import { OverviewShelf } from 'lib/pages/media/overview-shelf';
import { MediaType } from 'lib/types';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FiSearch } from 'react-icons/fi';

const homeSectionPaddingX = { base: 4, sm: 6, md: 0 } as const;

type SectionState<Data> = {
  data?: Data;
  error?: string;
};

type HomePageProps = {
  dashboardState: SectionState<DashboardData>;
  discoverySections: Array<HomeDiscoverySection>;
  isAuthenticated: boolean;
  userName?: string;
};

export type HomeDiscoverySection = {
  items: Array<MediaOverviewItem>;
  mediaType: MediaType.Movie | MediaType.Tv;
  seeAllHref: Route;
  title: string;
};

const SectionHeading = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <Stack gap={1}>
    <Heading
      fontSize={{ base: 'md', sm: 'lg' }}
      fontWeight="400"
      letterSpacing={0}
      textTransform="uppercase"
    >
      {title}
    </Heading>
    <Text color="gray.100" fontSize="sm">
      {subtitle}
    </Text>
  </Stack>
);

const getMediaHref = (mediaType: MediaType.Movie | MediaType.Tv, id: number) =>
  (mediaType === MediaType.Movie ? `/movie/${id}` : `/tv/show/${id}`) as Route;

const getEpisodeHref = (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
) =>
  `/tv/show/${showId}/season/${seasonNumber}/episode/${episodeNumber}` as Route;

const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(date))
    : 'Date unknown';

const getYear = (date: string) => (date ? date.slice(0, 4) : 'Unknown');
const whitespacePattern = /\s+/;

const getFirstName = (name?: string) =>
  name?.trim().split(whitespacePattern).at(0);

const LoginRegisterBlock = () => (
  <Grid
    alignItems="center"
    borderColor="gray.300"
    borderRadius={8}
    borderWidth={1}
    gap={4}
    padding={5}
    paddingX={{ base: 5, md: 6 }}
    templateColumns={{ base: '1fr', md: 'minmax(0, 1fr) auto' }}
  >
    <Stack gap={1}>
      <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
        TVSync
      </Heading>
      <Text color="white">
        Log in or register to save titles and organize your personal watchlists.
      </Text>
    </Stack>
    <Flex gap={3} wrap="wrap">
      <Button asChild>
        <Link href={'/login' as Route}>Log in</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={'/register' as Route}>Register</Link>
      </Button>
    </Flex>
  </Grid>
);

const HomeSearch = () => (
  <Box asChild paddingX={homeSectionPaddingX} width="full">
    <form action="/search">
      <Flex gap={3} marginX="auto" maxWidth="52rem" width="full">
        <Input
          _focusVisible={{
            borderColor: 'white',
            boxShadow: '0 0 0 1px white',
          }}
          _hover={{ borderColor: 'white' }}
          _placeholder={{ color: 'whiteAlpha.700' }}
          aria-label="Search movies and TV shows"
          borderColor="white"
          borderRadius={24}
          fontSize={{ base: 'md', md: 'lg' }}
          height={{ base: 12, md: 14 }}
          name="query"
          placeholder="Search movies and TV shows"
          type="search"
        />
        <input name="page" type="hidden" value="1" />
        <Button
          aria-label="Search"
          borderRadius={24}
          height={{ base: 12, md: 14 }}
          minWidth={{ base: 12, md: 14 }}
          type="submit"
        >
          <FiSearch />
        </Button>
      </Flex>
    </form>
  </Box>
);

const DashboardHero = ({ userName }: { userName?: string }) => (
  <Stack gap={4} maxWidth="48rem" paddingX={homeSectionPaddingX}>
    <Heading as="h1" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="500">
      {getFirstName(userName)
        ? `Welcome back, ${getFirstName(userName)}.`
        : 'Welcome back.'}
    </Heading>
    <Text color="white">
      Review your saved titles, check upcoming episodes, and see what is moving
      across movies and TV.
    </Text>
  </Stack>
);

const EmptyDashboardSection = ({
  actionHref,
  actionLabel,
  children,
  title,
}: {
  actionHref: Route;
  actionLabel: string;
  children: ReactNode;
  title: string;
}) => (
  <Grid
    borderColor="gray.300"
    borderRadius={8}
    borderWidth={1}
    gap={4}
    padding={5}
  >
    <Stack gap={2}>
      <Heading as="h3" fontSize="md" fontWeight="500">
        {title}
      </Heading>
      <Text color="gray.100" fontSize="sm">
        {children}
      </Text>
    </Stack>
    <Button alignSelf="flex-start" asChild size="sm">
      <Link href={actionHref}>{actionLabel}</Link>
    </Button>
  </Grid>
);

const PosterThumb = ({
  alt,
  posterPath,
}: {
  alt: string;
  posterPath: null | string;
}) => (
  <Image
    alt={alt}
    aspectRatio={2 / 3}
    background="gray.800"
    borderRadius={6}
    height="auto"
    objectFit="cover"
    src={posterPath ? `${IMAGE_URL}${posterPath}` : '/Movie Night-bro.svg'}
    width="100%"
  />
);

const UpcomingEpisodes = ({ data }: { data: DashboardData }) => (
  <Stack gap={4} paddingX={homeSectionPaddingX}>
    <SectionHeading
      subtitle="Future episodes from tracked TV shows when TMDB provides them."
      title="Upcoming Episodes"
    />
    {data.upcomingEpisodes.length === 0 ? (
      <EmptyDashboardSection
        actionHref={'/tv/popular?page=1' as Route}
        actionLabel="Browse TV shows"
        title="No dated episodes yet"
      >
        Upcoming air dates appear here for tracked shows with TMDB schedule
        data.
      </EmptyDashboardSection>
    ) : (
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
        {data.upcomingEpisodes.map((item) => (
          <Grid
            alignItems="center"
            borderColor="gray.300"
            borderRadius={8}
            borderWidth={1}
            gap={4}
            key={`${item.tmdbId}-${item.seasonNumber}-${item.episodeNumber}`}
            padding={4}
            templateColumns="72px minmax(0, 1fr) auto"
          >
            <PosterThumb
              alt={`${item.showTitle} poster`}
              posterPath={item.posterPath}
            />
            <Stack gap={1} minWidth={0}>
              <Heading asChild fontSize="md">
                <Link
                  href={`/tv/show/${item.tmdbId}` as Route}
                  prefetch={false}
                >
                  {item.showTitle}
                </Link>
              </Heading>
              <Text color="gray.100" fontSize="sm">
                S{item.seasonNumber} E{item.episodeNumber} - {item.episodeTitle}
              </Text>
              <Text color="gray.100" fontSize="sm">
                {formatDate(item.airDate)}
              </Text>
            </Stack>
            <Button asChild size="sm" variant="outline">
              <Link
                href={getEpisodeHref(
                  item.tmdbId,
                  item.seasonNumber,
                  item.episodeNumber
                )}
              >
                Open
              </Link>
            </Button>
          </Grid>
        ))}
      </SimpleGrid>
    )}
  </Stack>
);

const WatchlistPreview = ({ data }: { data: DashboardData }) => (
  <Stack gap={4} paddingX={homeSectionPaddingX}>
    <Flex align="center" gap={4} justify="space-between" wrap="wrap">
      <SectionHeading
        subtitle="A quick look at movies and shows you saved for later."
        title="Watchlist Preview"
      />
      <Button asChild size="sm" variant="outline">
        <Link href={'/watchlist' as Route}>Full watchlist</Link>
      </Button>
    </Flex>
    {data.watchlistPreview.length === 0 ? (
      <EmptyDashboardSection
        actionHref={'/search' as Route}
        actionLabel="Search titles"
        title="Your watchlist is empty"
      >
        Save movies and TV shows from search or detail pages to keep them close.
      </EmptyDashboardSection>
    ) : (
      <Grid
        columnGap={{ base: 4, md: 6 }}
        rowGap={{ base: 8, md: 10 }}
        templateColumns={{
          base: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        }}
      >
        {data.watchlistPreview.map((item) => (
          <Stack gap={3} key={`${item.mediaType}-${item.tmdbId}`} minWidth={0}>
            <Box asChild>
              <Link
                href={getMediaHref(item.mediaType, item.tmdbId)}
                prefetch={false}
              >
                <PosterThumb
                  alt={`${item.title} poster`}
                  posterPath={item.posterPath}
                />
              </Link>
            </Box>
            <Stack gap={1}>
              <Heading asChild fontSize="sm" lineClamp={2}>
                <Link
                  href={getMediaHref(item.mediaType, item.tmdbId)}
                  prefetch={false}
                >
                  {item.title}
                </Link>
              </Heading>
              <Text color="gray.100" fontSize="xs">
                {item.mediaType === MediaType.Movie ? 'Movie' : 'TV Show'} -{' '}
                {getYear(item.releaseDate)}
              </Text>
            </Stack>
            <WatchlistButton
              initialIsSaved
              mediaType={item.mediaType}
              size="xs"
              tmdbId={item.tmdbId}
            />
          </Stack>
        ))}
      </Grid>
    )}
  </Stack>
);

const ActivityFeed = ({ data }: { data: DashboardData }) => (
  <Stack gap={4} paddingX={homeSectionPaddingX}>
    <Flex align="center" gap={4} justify="space-between" wrap="wrap">
      <SectionHeading
        subtitle="Updates from public profiles you follow."
        title="Friend Activity"
      />
      <Button asChild size="sm" variant="outline">
        <Link href={'/search' as Route}>Find people</Link>
      </Button>
    </Flex>
    {data.activityFeed.length === 0 ? (
      <EmptyDashboardSection
        actionHref={'/search' as Route}
        actionLabel="Search titles"
        title="No friend activity yet"
      >
        Follow public profiles to see what they finish, rate, review, and save.
      </EmptyDashboardSection>
    ) : (
      <Grid gap={3}>
        {data.activityFeed.map((item) => (
          <Grid
            alignItems="center"
            borderColor="gray.300"
            borderRadius={8}
            borderWidth={1}
            gap={4}
            key={`${item.activityType}-${item.userId}-${item.tmdbId}-${item.activityAt}`}
            padding={4}
            templateColumns="56px minmax(0, 1fr)"
          >
            <Box asChild>
              <Link href={getMediaHref(item.mediaType, item.tmdbId)}>
                <PosterThumb
                  alt={`${item.title} poster`}
                  posterPath={item.posterPath}
                />
              </Link>
            </Box>
            <Stack gap={1} minWidth={0}>
              <Text fontSize="sm">
                <Link href={`/profile/${item.username}` as Route}>
                  {item.displayName}
                </Link>{' '}
                {item.sentence.replace(`${item.displayName} `, '')}
              </Text>
              <Text color="gray.100" fontSize="xs">
                {formatDate(item.activityAt)}
              </Text>
            </Stack>
          </Grid>
        ))}
      </Grid>
    )}
  </Stack>
);

const DashboardSections = ({
  state,
}: {
  state: SectionState<DashboardData>;
}) => {
  if (state.error) {
    return (
      <Stack gap={4} paddingX={homeSectionPaddingX}>
        <SectionHeading
          subtitle="Your personalized shelves could not load."
          title="Dashboard"
        />
        <Box
          borderColor="gray.300"
          borderRadius={8}
          borderWidth={1}
          padding={5}
        >
          <Text color="gray.100" fontSize="sm">
            {state.error}
          </Text>
        </Box>
      </Stack>
    );
  }

  if (!state.data) {
    return null;
  }

  return (
    <>
      <WatchlistPreview data={state.data} />
      <UpcomingEpisodes data={state.data} />
      <ActivityFeed data={state.data} />
    </>
  );
};

const DiscoverySection = ({ section }: { section: HomeDiscoverySection }) => (
  <Stack gap={5} paddingX={homeSectionPaddingX}>
    <Flex align="center" gap={4} justify="space-between">
      <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="500">
        {section.title}
      </Heading>
      <Button
        asChild
        background="white"
        borderRadius="999px"
        color="black"
        fontWeight="700"
        paddingX={4}
        size="sm"
      >
        <Link href={section.seeAllHref}>See All</Link>
      </Button>
    </Flex>
    <OverviewShelf
      items={section.items}
      mediaType={section.mediaType}
      seeAllHref={section.seeAllHref}
    />
  </Stack>
);

const DiscoverySections = ({
  sections,
}: {
  sections: Array<HomeDiscoverySection>;
}) => (
  <>
    {sections.map((section) => (
      <DiscoverySection key={section.title} section={section} />
    ))}
  </>
);

export const Home = ({
  dashboardState,
  discoverySections,
  isAuthenticated,
  userName,
}: HomePageProps) => {
  return (
    <Grid
      mb={8}
      paddingBottom={{ base: 6, md: 10 }}
      paddingX={{ base: 0, md: 6, lg: 8 }}
      rowGap={{ base: 10, md: 12 }}
      w="full"
    >
      {isAuthenticated ? (
        <DashboardHero userName={userName} />
      ) : (
        <Box paddingX={homeSectionPaddingX}>
          <LoginRegisterBlock />
        </Box>
      )}
      <HomeSearch />
      <DiscoverySections sections={discoverySections} />
      {isAuthenticated ? <DashboardSections state={dashboardState} /> : null}
    </Grid>
  );
};

export const HomeLoading = () => (
  <Grid
    mb={8}
    paddingBottom={{ base: 6, md: 10 }}
    paddingX={{ base: 4, sm: 6, md: 8 }}
    rowGap={{ base: 10, md: 12 }}
    w="full"
  >
    <Stack gap={4}>
      <Skeleton height="48px" maxWidth="580px" />
      <Skeleton height="24px" maxWidth="520px" />
    </Stack>
  </Grid>
);
