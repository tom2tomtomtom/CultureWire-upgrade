-- Creator Intel analyses table
create table if not exists creator_intel_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('post', 'creator', 'topic')),
  input text not null,
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'complete', 'failed')),
  results jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table creator_intel_analyses enable row level security;

create policy "Users can read own analyses"
  on creator_intel_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on creator_intel_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analyses"
  on creator_intel_analyses for update
  using (auth.uid() = user_id);

-- Index for history queries
create index idx_creator_intel_user_created
  on creator_intel_analyses (user_id, created_at desc);
