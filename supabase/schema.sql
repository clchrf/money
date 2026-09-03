-- 極簡記帳 — Supabase schema + Row Level Security
--
-- 在 Supabase Dashboard → SQL Editor 貼上執行即可。
--
-- 安全模型：
--   使用者透過 supabase.auth.signInAnonymously() 取得真正的 auth.uid()，
--   完全不需要註冊或輸入 Email。每張表的 user_id 預設為 auth.uid()，
--   且 RLS 一律比對 auth.uid() = user_id。
--
--   因此前端就算竄改送出的 user_id 也讀不到、寫不進別人的資料 ——
--   隔離是由資料庫強制的，不是靠前端自律。
--
-- 前置需求：Dashboard → Authentication → Providers → 啟用 Anonymous sign-ins

-- ---------------------------------------------------------------
-- profiles：使用者偏好（Email、時區）
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  timezone    text not null default 'Asia/Taipei',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- categories：分類（可自訂、可排序）
-- ---------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null default '📦',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists categories_user_sort_idx on public.categories (user_id, sort_order);

-- ---------------------------------------------------------------
-- transactions：交易（支出）
-- 分類刪除時保留交易，category_id 設為 null
-- ---------------------------------------------------------------
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  category_id  uuid references public.categories(id) on delete set null,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists transactions_user_created_idx on public.transactions (user_id, created_at desc);

-- ---------------------------------------------------------------
-- budgets：預算（category_id 為 null 代表總預算）
-- ---------------------------------------------------------------
create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  period       text not null default 'monthly' check (period in ('monthly', 'weekly')),
  created_at   timestamptz not null default now()
);
-- 每位使用者對同一分類只能有一筆預算；總預算（category_id is null）也只能有一筆
create unique index if not exists budgets_user_category_idx
  on public.budgets (user_id, category_id) where category_id is not null;
create unique index if not exists budgets_user_total_idx
  on public.budgets (user_id) where category_id is null;

-- ---------------------------------------------------------------
-- fixed_expenses：固定支出
-- ---------------------------------------------------------------
create table if not exists public.fixed_expenses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name              text not null,
  amount            numeric(12, 2) not null check (amount > 0),
  category_id       uuid references public.categories(id) on delete set null,
  frequency         text not null default 'monthly' check (frequency in ('monthly', 'weekly')),
  next_date         date not null,
  note              text not null default '',
  enabled           boolean not null default true,
  auto_record       boolean not null default false,
  reminder_enabled  boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists fixed_expenses_due_idx on public.fixed_expenses (next_date) where enabled;

-- ---------------------------------------------------------------
-- reminder_settings：提醒設定（每位使用者一筆）
-- ---------------------------------------------------------------
create table if not exists public.reminder_settings (
  user_id                 uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email                   text,
  noon_enabled            boolean not null default false,
  evening_enabled         boolean not null default false,
  noon_time               time not null default '12:00',
  evening_time            time not null default '19:00',
  monthly_report_enabled  boolean not null default false,
  timezone                text not null default 'Asia/Taipei'
);

-- ---------------------------------------------------------------
-- updated_at 自動維護
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
-- 每張表都啟用，且四種操作都必須是自己的資料。
-- with check 防止把資料寫成別人的 user_id。
-- ---------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.transactions      enable row level security;
alter table public.budgets           enable row level security;
alter table public.fixed_expenses    enable row level security;
alter table public.reminder_settings enable row level security;

-- profiles / reminder_settings 以主鍵作為擁有者欄位
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own reminder settings" on public.reminder_settings;
create policy "own reminder settings" on public.reminder_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own fixed expenses" on public.fixed_expenses;
create policy "own fixed expenses" on public.fixed_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 新使用者自動建立 profile 與預設分類
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;

  insert into public.categories (user_id, name, icon, sort_order) values
    (new.id, '餐飲', '🍜', 0),
    (new.id, '交通', '🚇', 1),
    (new.id, '購物', '🛍️', 2),
    (new.id, '生活', '🏠', 3),
    (new.id, '娛樂', '🎮', 4),
    (new.id, '醫療', '💊', 5),
    (new.id, '教育', '📚', 6),
    (new.id, '其他', '📦', 7);

  insert into public.reminder_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
