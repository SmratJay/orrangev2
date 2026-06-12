-- Add default_upi_id to users table
alter table public.users
  add column if not exists default_upi_id text,
  add column if not exists notify_order_updates boolean default true,
  add column if not exists notify_disputes boolean default true;

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'order_created', 'order_completed', 'order_cancelled',
    'order_accepted', 'payment_sent', 'payment_received',
    'dispute_filed', 'dispute_resolved', 'system'
  )),
  title text not null,
  message text not null,
  data jsonb,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies: users can only see/update their own notifications
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = (
    select id from public.users where privy_user_id = auth.uid()::text limit 1
  ));

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = (
    select id from public.users where privy_user_id = auth.uid()::text limit 1
  ));

-- Service role can insert notifications for any user
create policy "notifications_insert_service"
  on public.notifications for insert
  with check (true);

-- Realtime: enable for notifications
alter publication supabase_realtime add table public.notifications;
