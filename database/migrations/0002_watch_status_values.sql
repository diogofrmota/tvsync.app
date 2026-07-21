alter table user_media
  drop constraint if exists user_media_watch_status_check;

update user_media
set watch_status = 'paused'
where watch_status = 'on_hold';

alter table user_media
  add constraint user_media_watch_status_check
    check (
      (media_type = 'movie' and watch_status in ('planned', 'watched'))
      or
      (media_type = 'tv' and watch_status in ('planned', 'watching', 'completed', 'dropped', 'paused'))
    );
