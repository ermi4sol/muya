-- ===== Better Auth tables (core + twoFactor plugin + Telegram fields) =====
-- Better Auth 1.7.x default Postgres schema (camelCase columns, text ids).
-- Applied live as migration "v2_better_auth" via Supabase MCP.

create table "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  -- twoFactor plugin
  "twoFactorEnabled" boolean default false,
  -- MUYA telegram plugin (additional user fields)
  "telegramId" text unique,
  "telegramUsername" text
);

create table "session" (
  "id" text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
  "id" text primary key,
  "issuer" text not null,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "verification" (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "twoFactor" (
  "id" text primary key,
  "secret" text not null,
  "backupCodes" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "verified" boolean default true,
  "failedVerificationCount" integer default 0,
  "lockedUntil" timestamptz
);

create index if not exists idx_session_user on "session" ("userId");
create index if not exists idx_session_token on "session" ("token");
create index if not exists idx_account_user on "account" ("userId");
create index if not exists idx_verification_identifier on "verification" ("identifier");
create index if not exists idx_twofactor_user on "twoFactor" ("userId");
create index if not exists idx_user_telegram on "user" ("telegramId");

-- RLS on (no policies — service role / direct Postgres only)
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;
alter table "twoFactor" enable row level security;
