-- Phase 3: authentication support

-- Magic links can be issued to emails that don't have an account yet
-- (creator sign-up creates the row on first verified click)
alter table magic_link_tokens alter column owner_id drop not null;
alter table magic_link_tokens add column email text;
alter table magic_link_tokens add column redirect_to text;

-- Custom admin credentials: password hash + TOTP secret
alter table admin_users add column password_hash text;
alter table admin_users add column totp_secret text;

-- Simple fixed-window rate limiting shared across serverless instances
create table rate_limits (
  key text primary key,           -- e.g. 'magiclink:email:foo@bar.com'
  count int not null default 1,
  window_start timestamptz not null default now()
);
alter table rate_limits enable row level security;

-- Admin account-setup links reuse the magic-link table
alter table magic_link_tokens drop constraint magic_link_tokens_owner_type_check;
alter table magic_link_tokens add constraint magic_link_tokens_owner_type_check
  check (owner_type in ('customer','creator','admin'));
