import { Icon } from '@chakra-ui/react';
import { FiHeart } from 'react-icons/fi';

/**
 * The red heart that marks favourite lists. It is the same filled heart the
 * poster quick actions use for a favourited title, so headings and posters
 * speak the same visual language instead of mixing in an emoji.
 */
export const FavoriteHeartIcon = () => (
  <Icon
    aria-hidden
    as={FiHeart}
    color="red.500"
    fill="currentColor"
    flexShrink={0}
  />
);
