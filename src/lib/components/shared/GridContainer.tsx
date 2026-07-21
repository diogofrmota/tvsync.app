import { Grid, Skeleton } from '@chakra-ui/react';

type GridContainerProps = {
  isLoading: boolean;
  children: React.ReactNode;
};

const GridContainer = ({ isLoading, children }: GridContainerProps) => {
  return (
    <Skeleton loading={!!isLoading} marginY={8} minHeight="60vh">
      <Grid
        columnGap={{ base: 4, md: 5, lg: 6 }}
        rowGap={{ base: 8, md: 10 }}
        templateColumns={{
          base: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
          lg: 'repeat(8, minmax(0, 1fr))',
        }}
      >
        {children}
      </Grid>
    </Skeleton>
  );
};

export default GridContainer;
