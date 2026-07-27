import { Box, Text } from '@chakra-ui/react';
import { IMAGE_URL } from 'lib/components/shared/tmdb-image-urls';

const WHITESPACE_PATTERN = /\s+/u;

/**
 * The circular profile avatar. It is a poster from a title the user picked in
 * search — TvSync stores the TMDB image path only, never an uploaded file — and
 * falls back to the initials generated from the display name.
 */
export const getProfileInitials = (name: string) =>
  name
    .normalize('NFKC')
    .trim()
    .split(WHITESPACE_PATTERN)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

export const PROFILE_AVATAR_SIZE = {
  base: '6.5rem',
  md: '8rem',
} as const;

export const ProfileAvatarImage = ({
  avatarPath,
  avatarTitle,
  displayName,
  size = PROFILE_AVATAR_SIZE,
}: {
  avatarPath: string | null;
  avatarTitle: string | null;
  displayName: string;
  size?: Record<string, string> | string;
}) => {
  const label = avatarPath
    ? `${displayName} profile avatar, poster of ${avatarTitle || 'a saved title'}`
    : `${displayName} profile avatar`;

  return (
    <Box
      alignItems="center"
      aria-label={label}
      background="bg.muted"
      backgroundImage={
        avatarPath ? `url(${IMAGE_URL}${avatarPath})` : undefined
      }
      backgroundPosition="center"
      backgroundSize="cover"
      borderColor="gold.400"
      borderRadius="full"
      borderWidth="2px"
      display="flex"
      height={size}
      justifyContent="center"
      overflow="hidden"
      role="img"
      width={size}
    >
      {avatarPath ? null : (
        <Text
          color="fg.muted"
          fontSize={{ base: 'xl', md: '2xl' }}
          fontWeight="bold"
        >
          {getProfileInitials(displayName)}
        </Text>
      )}
    </Box>
  );
};
