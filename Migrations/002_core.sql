-- 002_core.sql

-- Helper: set/validate user_id from JWT (for client inserts)
create or replace function public.set_auth_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- In SQL Editor (no JWT), v_uid is NULL → do nothing.
  if v_uid is not null then
    if new.user_id is null then
      new.user_id := v_uid;
    elsif new.user_id <> v_uid then
      raise exception 'Cannot set user_id to another user';
    end if;
  end if;
  return new;
end;
$$;

-- CATEGORIES (per-user taxonomy)
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('expense','income')),
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, type)
);

-- Auto-updated timestamps
drop trigger if exists _categories_set_timestamp on public.categories;
create trigger _categories_set_timestamp
before update on public.categories
for each row execute procedure public.set_timestamp();

-- Auto/failsafe user ownership on client inserts
drop trigger if exists _categories_set_user on public.categories;
create trigger _categories_set_user
before insert on public.categories
for each row execute procedure public.set_auth_user_id();

-- RLS
alter table public.categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='categories' and policyname='categories_select_own'
  ) then
    create policy categories_select_own on public.categories
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='categories' and policyname='categories_write_own'
  ) then
    create policy categories_write_own on public.categories
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- TRANSACTIONS (facts)
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null, -- uncategorized allowed
  amount      numeric(12,2) not null check (amount >= 0),
  occurred_on date not null default (now() at time zone 'utc')::date,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-updated timestamps
drop trigger if exists _transactions_set_timestamp on public.transactions;
create trigger _transactions_set_timestamp
before update on public.transactions
for each row execute procedure public.set_timestamp();

-- Auto/failsafe user ownership on client inserts
drop trigger if exists _transactions_set_user on public.transactions;
create trigger _transactions_set_user
before insert on public.transactions
for each row execute procedure public.set_auth_user_id();

-- RLS
alter table public.transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='transactions' and policyname='transactions_select_own'
  ) then
    create policy transactions_select_own on public.transactions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='transactions' and policyname='transactions_write_own'
  ) then
    create policy transactions_write_own on public.transactions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Performance indexes for dashboard queries
create index if not exists idx_tx_user_date
  on public.transactions (user_id, occurred_on);

create index if not exists idx_tx_user_category
  on public.transactions (user_id, category_id);
