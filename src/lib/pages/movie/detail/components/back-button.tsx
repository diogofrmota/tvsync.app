'use client';

import { Box } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

export const BackButton = () => {
  const router = useRouter();
  return (
    <Box
      _hover={{ color: 'gold.300' }}
      alignItems="center"
      alignSelf="flex-start"
      as="button"
      color="fg.muted"
      cursor="pointer"
      display="flex"
      fontWeight="500"
      gap={2}
      onClick={() => router.back()}
      transitionDuration="fast"
      transitionProperty="color"
      transitionTimingFunction="ease-out"
    >
      <FiArrowLeft aria-hidden /> Back
    </Box>
  );
};
