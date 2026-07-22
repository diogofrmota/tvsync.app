'use client';

import {
  AspectRatio,
  Box,
  Button,
  Grid,
  Heading,
  Skeleton,
  Text,
} from '@chakra-ui/react';
import { BionifiedParagraph } from 'lib/components/BionifiedParagraph';
import PosterImage from 'lib/components/shared/PosterImage';
import { usePersonDetail } from 'lib/services/tmdb/person/detail/index.client';
import { countAge } from 'lib/utils/count-age';
import { useRouter } from 'next/navigation';

export const PersonDetailPage = ({ personId }: { personId: number }) => {
  const router = useRouter();

  const { data, isLoading } = usePersonDetail(personId);

  return (
    <Grid gap={8} marginX={8}>
      <Button onClick={router.back}>Back</Button>

      <Skeleton loading={isLoading}>
        <Box
          alignItems="start"
          display={{ base: 'grid', md: 'flex' }}
          gap={{ base: 8, md: 16 }}
        >
          {data && (
            <AspectRatio
              marginX={[8, '25%', 0]}
              minWidth={{ md: 300 }}
              ratio={3.6 / 5}
            >
              <PosterImage
                // style={{ filter: data.deathday && "grayscale(100%)" }}
                alt={`${data.name} profile image`}
                src={data.profile_path}
              />
            </AspectRatio>
          )}

          <Box>
            {data && (
              <Heading
                fontWeight="extrabold"
                letterSpacing={0}
                marginX={[8, 8, 0]}
                size="lg"
                textAlign={['center', 'center', 'inherit']}
                textTransform="uppercase"
                wordBreak="break-word"
              >
                {data.name}
              </Heading>
            )}

            {data && (
              <Grid gap={4}>
                <Box
                  fontSize="xs"
                  fontWeight="light"
                  letterSpacing={0}
                  marginY={2}
                  textTransform="uppercase"
                >
                  {data.deathday ? (
                    <Text>
                      {data.deathday} (
                      {data.birthday
                        ? countAge(data.birthday, data.deathday)
                        : ''}{' '}
                      years)
                    </Text>
                  ) : (
                    data.birthday && (
                      <Text>Age : {countAge(data.birthday)} years</Text>
                    )
                  )}
                </Box>
                {data.biography ? (
                  <BionifiedParagraph
                    fontSize={{ base: 'sm', md: 'md' }}
                    lineHeight={1.75}
                  >
                    {data.biography}
                  </BionifiedParagraph>
                ) : (
                  <Text color="gray.400">
                    No biography is available from TMDB yet.
                  </Text>
                )}
              </Grid>
            )}
          </Box>
        </Box>
      </Skeleton>
    </Grid>
  );
};
