-- Optional production schema for Supabase/PostgreSQL.
-- The runnable MVP uses local SQLite. When moving to Supabase, execute this in
-- the Supabase SQL editor and access it only from trusted server-side routes.

create extension if not exists pgcrypto;

create table if not exists public.anonymous_users (
  id uuid primary key,
  nickname varchar(24) check (nickname is null or char_length(trim(nickname)) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.anonymous_users(id),
  image_url text not null,
  source_url text,
  source_label text,
  source_author text,
  license_name text,
  is_my_cat boolean not null default false,
  is_visible boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'under_re_review', 'removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  reviewer_id uuid not null references public.anonymous_users(id) on delete cascade,
  decision text not null check (decision in ('approve', 'reject')),
  created_at timestamptz not null default now(),
  unique (cat_id, reviewer_id)
);

create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  artist_id uuid not null references public.anonymous_users(id) on delete cascade,
  image_url text not null,
  moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'under_review', 'hidden')),
  created_at timestamptz not null default now(),
  unique (cat_id, artist_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  reporter_id uuid not null references public.anonymous_users(id) on delete cascade,
  reason text not null check (reason in ('not_cat', 'animal_abuse', 'sexual', 'violence', 'spam', 'other')),
  details varchar(500),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cat_id, reporter_id)
);

create table if not exists public.re_reviews (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  reviewer_id uuid not null references public.anonymous_users(id) on delete cascade,
  decision text not null check (decision in ('keep', 'remove')),
  created_at timestamptz not null default now(),
  unique (cat_id, reviewer_id)
);

create table if not exists public.drawing_reports (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid not null references public.drawings(id) on delete cascade,
  reporter_id uuid not null references public.anonymous_users(id) on delete cascade,
  reason text not null check (reason in ('sexual', 'violence', 'hate', 'harassment', 'spam', 'other')),
  details varchar(500),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (drawing_id, reporter_id)
);

create table if not exists public.drawing_reviews (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid not null references public.drawings(id) on delete cascade,
  reviewer_id uuid not null references public.anonymous_users(id) on delete cascade,
  decision text not null check (decision in ('keep', 'remove')),
  created_at timestamptz not null default now(),
  unique (drawing_id, reviewer_id)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.anonymous_users(id) on delete cascade,
  type text not null check (type in ('bug', 'suggestion')),
  message varchar(2000) not null,
  page_url text,
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists cats_status_created_idx on public.cats(status, created_at);
create index if not exists reviews_cat_idx on public.reviews(cat_id);
create index if not exists drawings_cat_idx on public.drawings(cat_id);
create index if not exists reports_cat_unresolved_idx on public.reports(cat_id) where resolved_at is null;
create index if not exists re_reviews_cat_idx on public.re_reviews(cat_id);
create index if not exists drawing_reports_drawing_idx on public.drawing_reports(drawing_id);
create index if not exists drawing_reviews_drawing_idx on public.drawing_reviews(drawing_id);
create index if not exists feedback_status_created_idx on public.feedback(status, created_at);

alter table public.anonymous_users enable row level security;
alter table public.cats enable row level security;
alter table public.reviews enable row level security;
alter table public.drawings enable row level security;
alter table public.reports enable row level security;
alter table public.re_reviews enable row level security;
alter table public.drawing_reports enable row level security;
alter table public.drawing_reviews enable row level security;
alter table public.feedback enable row level security;

-- Browser clients deliberately receive no direct table access. The anonymous
-- cookie is verified by the app server, which should use SUPABASE_SERVICE_ROLE_KEY.
revoke all on all tables in schema public from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('cat-images', 'cat-images', false), ('drawings', 'drawings', false)
on conflict (id) do nothing;
