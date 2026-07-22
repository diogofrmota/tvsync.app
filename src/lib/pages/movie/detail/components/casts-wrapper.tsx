import { Avatar, Flex, Grid, Heading, Skeleton, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';
import type { MovieCreditsResponse } from 'lib/services/tmdb/movie/credits/types';
import Link from 'next/link';

type CastsWrapperProps = {
  isLoadingCredits?: boolean;
  credits?: MovieCreditsResponse;
};

const CastsWrapper = ({ isLoadingCredits, credits }: CastsWrapperProps) => {
  const cast =
    credits?.cast.filter(
      (member) => member.id > 0 && member.name.trim().length > 0
    ) ?? [];
  const hasCast = cast.length > 0;

  return (
    <Skeleton asChild loading={!!isLoadingCredits}>
      <Grid as="section" gap={4}>
        <Heading fontSize={{ base: 'xl', md: '2xl' }}>Cast</Heading>
        {credits && hasCast ? (
          <Grid
            gap={4}
            templateColumns={{
              base: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))',
            }}
          >
            {cast.slice(0, 12).map((movieCast) => (
              <Flex alignItems="center" asChild gap={3} key={movieCast.id}>
                <Link
                  aria-label={`View ${movieCast.name}`}
                  href={`/person/${movieCast.id}`}
                  prefetch={false}
                >
                  <Avatar.Root size="lg">
                    <Avatar.Fallback name={movieCast.name} />
                    {movieCast.profile_path ? (
                      <Avatar.Image
                        alt=""
                        src={`${IMAGE_URL}${movieCast.profile_path}`}
                      />
                    ) : null}
                  </Avatar.Root>
                  <Grid gap={0} minWidth={0}>
                    <Text fontWeight="600" lineClamp={2}>
                      {movieCast.name}
                    </Text>
                    {movieCast.character ? (
                      <Text color="fg.muted" fontSize="sm" lineClamp={2}>
                        {movieCast.character}
                      </Text>
                    ) : null}
                  </Grid>
                </Link>
              </Flex>
            ))}
          </Grid>
        ) : (
          <Text color="fg.muted">
            No cast information is available from TMDB.
          </Text>
        )}
      </Grid>
    </Skeleton>
  );
};

export default CastsWrapper;
