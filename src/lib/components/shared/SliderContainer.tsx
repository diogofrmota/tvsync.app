import { Box, Button, Flex, Heading, HStack, Spacer } from '@chakra-ui/react';
import Link from 'next/link';
import type { ComponentProps } from 'react';

type SliderContainerProps = {
  sectionTitle?: string;
  onClickSeeMore?: () => void;
  seeMoreHref?: ComponentProps<typeof Link>['href'];
  seeMoreLabel?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  trackPaddingX?: ComponentProps<typeof Flex>['paddingX'];
};

const SliderContainer = ({
  sectionTitle,
  onClickSeeMore,
  seeMoreHref,
  seeMoreLabel = 'see more',
  children,
  footer,
  trackPaddingX = { base: 4, sm: 6, md: 0 },
}: SliderContainerProps) => {
  let seeMoreButton: React.ReactNode = null;
  const seeMoreButtonProps = {
    background: 'white',
    borderRadius: '999px',
    color: 'black',
    fontWeight: '700',
    marginLeft: 'auto',
    paddingX: 4,
    size: { base: 'xs', sm: 'sm' },
  } as const;

  if (seeMoreHref) {
    seeMoreButton = (
      <Button asChild {...seeMoreButtonProps}>
        <Link href={seeMoreHref}>{seeMoreLabel}</Link>
      </Button>
    );
  } else if (onClickSeeMore) {
    seeMoreButton = (
      <Button onClick={onClickSeeMore} {...seeMoreButtonProps}>
        {seeMoreLabel}
      </Button>
    );
  }

  return (
    <Box>
      {sectionTitle && (
        <Flex alignItems="center" gap={3} paddingX={trackPaddingX}>
          <Heading
            fontSize={{ base: 'md', sm: 'lg' }}
            fontWeight="400"
            letterSpacing={0}
            minWidth={0}
            textTransform="uppercase"
          >
            {sectionTitle}
          </Heading>

          {seeMoreButton}
        </Flex>
      )}

      <Flex overflowX="auto" paddingX={trackPaddingX}>
        <Flex
          alignItems="center"
          flexWrap="nowrap"
          gap={{ base: 4, sm: 5, md: 6 }}
          minHeight={{ base: '220px', sm: '235px', md: '250px' }}
          overflow="visible"
        >
          {children}
        </Flex>
      </Flex>

      <Spacer height={4} />

      {footer ? (
        <HStack gap={4} paddingX={trackPaddingX}>
          {footer}
        </HStack>
      ) : null}
    </Box>
  );
};

export default SliderContainer;
