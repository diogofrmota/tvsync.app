-- Privacy compliance (GDPR / CCPA): the account-level choices the product has
-- to be able to honour, plus the trail proving when a choice was last made.
--
-- The rights themselves are served by code rather than by schema: access and
-- portability read the existing per-user tables, rectification is the profile
-- editor, and erasure is the existing cascading delete of `profiles`. Only the
-- objection/opt-out choice needs somewhere to live.

alter table profiles
  add column if not exists analytics_opt_out boolean not null default false,
  add column if not exists privacy_choices_updated_at timestamptz;

comment on column profiles.analytics_opt_out is
  'GDPR Art. 21 objection and CCPA opt-out of sale/sharing. When true no analytics script is loaded for this account.';

comment on column profiles.privacy_choices_updated_at is
  'When the account last changed a privacy choice, so a request about it can be answered with a date.';

-- The admin dashboard reports how many accounts have objected; only the rows
-- that opted out are indexed, which keeps the count off the full table.
create index if not exists profiles_analytics_opt_out_idx
  on profiles (analytics_opt_out)
  where analytics_opt_out;
