import { Grid } from '@chakra-ui/react';
import { SectionLoading } from 'lib/components/shared/Section';

const GridContainer = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) => {
  if (isLoading) {
    return <SectionLoading />;
  }
  return (
    <Grid
      columnGap={{ base: 3, md: 5 }}
      rowGap={{ base: 7, md: 9 }}
      templateColumns={{
        base: 'repeat(3, minmax(0, 1fr))',
        md: 'repeat(6, minmax(0, 1fr))',
        xl: 'repeat(9, minmax(0, 1fr))',
      }}
    >
      {children}
    </Grid>
  );
};
export default GridContainer;
