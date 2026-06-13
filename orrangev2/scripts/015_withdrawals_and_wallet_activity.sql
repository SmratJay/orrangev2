-- Wallet withdrawals table
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric not null,
  destination_address text not null,
  tx_hash text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  network text default 'sepolia',
  token_symbol text default 'USDC',
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- Indexes
create index if not exists withdrawals_user_id_idx on public.withdrawals(user_id);
create index if not exists withdrawals_status_idx on public.withdrawals(status);
create index if not exists withdrawals_created_at_idx on public.withdrawals(created_at desc);

-- Enable RLS
alter table public.withdrawals enable row level security;

-- Policies: users can only see their own withdrawals
create policy "withdrawals_select_own"
  on public.withdrawals for select
  using (user_id = (
    select id from public.users where privy_user_id = auth.uid()::text limit 1
  ));

-- Users can insert their own withdrawals (for tracking)
create policy "withdrawals_insert_own"
  on public.withdrawals for insert
  with check (user_id = (
    select id from public.users where privy_user_id = auth.uid()::text limit 1
  ));

-- Service role can update any withdrawal
create policy "withdrawals_update_service"
  on public.withdrawals for update
  using (true);

-- External deposits tracking (for showing received funds)
create table if not exists public.external_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric not null,
  from_address text not null,
  tx_hash text not null,
  token_symbol text default 'USDC',
  network text default 'sepolia',
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists external_deposits_user_id_idx on public.external_deposits(user_id);
create index if not exists external_deposits_created_at_idx on public.external_deposits(created_at desc);

-- Enable RLS
alter table public.external_deposits enable row level security;

-- Policies: users can only see their own deposits
create policy "external_deposits_select_own"
  on public.external_deposits for select
  using (user_id = (
    select id from public.users where privy_user_id = auth.uid()::text limit 1
  ));

-- Service role can insert deposits
create policy "external_deposits_insert_service"
  on public.external_deposits for insert
  with check (true);
