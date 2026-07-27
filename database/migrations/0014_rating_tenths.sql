alter table ratings
  drop constraint if exists ratings_rating_range_check;

alter table ratings
  add constraint ratings_rating_range_check
    check (rating between 0 and 10 and rating * 10 = floor(rating * 10));
