import { Text } from '@chakra-ui/react';

type PosterLabelProps = {
  label: string;
};

const PosterLabel = ({ label }: PosterLabelProps) => {
  return (
    <Text
      _groupHover={{ visibility: 'visible' }}
      color="white"
      fontSize="xs"
      left="50%"
      letterSpacing={0}
      maxWidth="90%"
      position="absolute"
      textAlign="center"
      textTransform="uppercase"
      top="50%"
      transform="translate(-50%, -50%)"
      visibility="hidden"
      wordBreak="break-word"
    >
      {label}
    </Text>
  );
};

export default PosterLabel;
