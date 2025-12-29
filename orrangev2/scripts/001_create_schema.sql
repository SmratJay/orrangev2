-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Users table - extends auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  user_type text not null check (user_type in ('user', 'merchant', 'admin')),
  full_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- User profiles/kyc
create table if not exists public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone_number text,
  country text,
  kyc_status text default 'pending' check (kyc_status in ('pending', 'approved', 'rejected')),
  inr_upi_address text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Merchants table
create table if not exists public.merchants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  merchant_name text not null,
  business_type text,
  approval_status text default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  daily_limit_usd decimal(15, 2) default 10000,
  monthly_volume_usd decimal(15, 2) default 0,
  inr_bank_account text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Transactions table
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  merchant_id uuid references public.merchants(id) on delete set null,
  transaction_type text not null check (transaction_type in ('onramp', 'offramp')),
  from_currency text not null,
  to_currency text not null,
  from_amount decimal(15, 8) not null,
  to_amount decimal(15, 2) not null,
  exchange_rate decimal(15, 8),
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Admin logs
create table if not exists public.admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.transactions enable row level security;
alter table public.admin_logs enable row level security;

-- RLS Policies for users table
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

create policy "admin_select_all_users"
  on public.users for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and user_type = 'admin'
    )
  );

-- RLS Policies for user_profiles
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- RLS Policies for merchants
create policy "merchants_select_own"
  on public.merchants for select
  using (auth.uid() = user_id);

create policy "merchants_insert_own"
  on public.merchants for insert
  with check (auth.uid() = user_id);

create policy "merchants_update_own"
  on public.merchants for update
  using (auth.uid() = user_id);

create policy "admin_select_all_merchants"
  on public.merchants for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and user_type = 'admin'
    )
  );

-- RLS Policies for transactions
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "admin_select_all_transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and user_type = 'admin'
    )
  );

-- RLS Policies for admin_logs
create policy "admin_logs_insert_own"
  on public.admin_logs for insert
  with check (
    exists (
      select 1 from public.users where id = auth.uid() and user_type = 'admin'
    )
  );

create policy "admin_logs_select_own"
  on public.admin_logs for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and user_type = 'admin'
    )
  );
