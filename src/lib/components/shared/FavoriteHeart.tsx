import { Box } from '@chakra-ui/react';
import { FiHeart } from 'react-icons/fi';

/**
 * The red heart that marks favourite lists. It is the same filled heart the
 * poster quick actions use for a favourited title, so headings and posters
 * speak the same visual language instead of mixing in an emoji.
 *
 * The icon is rendered as a child of a styled span rather than through Chakra's
 * icon wrapper: this component renders inside Server Components, and a
 * component handed to a Chakra client component as a prop cannot be serialized
 * across that boundary.
 */
export const FavoriteHeartIcon = () => (
  <Box
    aria-hidden
    as="span"
    color="red.500"
    display="inline-flex"
    flexShrink={0}
  >
    <FiHeart fill="currentColor" />
  </Box>
);
