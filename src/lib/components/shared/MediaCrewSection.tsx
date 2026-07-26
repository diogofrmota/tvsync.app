import { Avatar, Flex, Grid, Heading, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';

export type MediaCrewPerson = {
  id: number;
  name: string;
  profilePath: string | null | undefined;
  /** The credited job, shown under the name like a cast member's character. */
  role?: string;
};

/**
 * A credited crew group — the director on a movie, the director or creator on
 * a TV show — rendered in the same avatar grid as the cast section directly
 * below it, so the two read as one block of people rather than a line of text
 * stranded in the header.
 */
export const MediaCrewSection = ({
  emptyMessage,
  people,
  title,
}: {
  emptyMessage: string;
  people: Array<MediaCrewPerson>;
  title: string;
}) => (
  <Grid as="section" gap={4}>
    <Heading fontSize={{ base: 'xl', md: '2xl' }}>{title}</Heading>
    {people.length > 0 ? (
      <Grid
        gap={4}
        templateColumns={{
          base: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
          xl: 'repeat(6, minmax(0, 1fr))',
        }}
      >
        {people.map((person) => (
          <Flex alignItems="center" gap={3} key={person.id}>
            <Avatar.Root size="lg">
              <Avatar.Fallback name={person.name} />
              {person.profilePath ? (
                <Avatar.Image
                  alt=""
                  src={`${IMAGE_URL}${person.profilePath}`}
                />
              ) : null}
            </Avatar.Root>
            <Grid gap={0} minWidth={0}>
              <Text fontWeight="600" lineClamp={2}>
                {person.name}
              </Text>
              {person.role ? (
                <Text color="fg.muted" fontSize="sm" lineClamp={2}>
                  {person.role}
                </Text>
              ) : null}
            </Grid>
          </Flex>
        ))}
      </Grid>
    ) : (
      <Text color="fg.muted">{emptyMessage}</Text>
    )}
  </Grid>
);
