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

-- Library items carried a separate, never-exposed privacy flag that always
-- defaulted to private, which hid every public profile's statistics. With
-- profiles now public, their tracked media is public too.
update user_media
set privacy_setting = 'public'
where privacy_setting is distinct from 'public';

alter table user_media
  alter column privacy_setting set default 'public';
