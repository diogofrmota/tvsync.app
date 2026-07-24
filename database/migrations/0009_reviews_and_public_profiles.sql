-- Optional free-text review a user can leave alongside a rating.
alter table ratings
  add column if not exists review text;

-- Profile visibility has been removed: every profile is now public. Existing
-- rows are promoted to public and the column default follows suit so future
-- inserts stay public even where the value is not supplied explicitly.
update profiles
set privacy_setting = 'public'
where privacy_setting is distinct from 'public';

alter table profiles
  alter column privacy_setting set default 'public';
