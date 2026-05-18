-- Mexican government instruments tracker schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.investment_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  investment_date date,
  maturity_date date,
  instrument text not null check (instrument in ('BONOS', 'UDIBONOS', 'CETES', 'BONDDIA')),
  check (
    instrument = 'BONDDIA'
    or (investment_date is not null and maturity_date is not null)
  ),
  amount numeric(14, 2) not null check (amount >= 0),
  annual_rate numeric(10, 6) not null check (annual_rate >= 0),
  inflation_rate numeric(10, 6) not null check (inflation_rate >= 0),
  provisional_withholding_rate numeric(10, 6) not null check (provisional_withholding_rate >= 0),
  estimated_annual_withholding numeric(14, 2) not null check (estimated_annual_withholding >= 0),
  term_years integer not null default 10 check (term_years > 0),
  coupon_frequency_months integer check (coupon_frequency_months > 0),
  source_snapshot_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  status text not null check (status in ('fresh', 'partial', 'failed')),
  quotes jsonb not null default '[]'::jsonb,
  inflation_annual numeric(10, 6),
  inpc numeric(14, 6),
  provisional_withholding_rate numeric(10, 6),
  notes text[] not null default '{}'
);

create table if not exists public.monthly_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  recommendation text not null check (
    recommendation in ('maintain_60_40', 'adjust_mix', 'consider_other_gov_instrument')
  ),
  target_allocation jsonb not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  rationale text[] not null default '{}',
  risks text[] not null default '{}',
  data_used text[] not null default '{}',
  macro_summary text[] not null default '{}',
  curve_summary text[] not null default '{}',
  portfolio_summary text[] not null default '{}',
  action_items text[] not null default '{}',
  watch_conditions text[] not null default '{}',
  not_financial_advice boolean not null default true
);

create table if not exists public.tax_declaration_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year between 2000 and 2100),
  instrument text not null check (instrument in ('BONOS', 'UDIBONOS', 'CETES', 'BONDDIA')),
  source text not null default 'MANUAL' check (source in ('CETES_DIRECTO', 'MANUAL')),
  nominal_interest numeric(14, 2) not null default 0,
  real_interest numeric(14, 2) not null default 0,
  isr_withheld numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investment_lots enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.monthly_analyses enable row level security;
alter table public.tax_declaration_records enable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.investment_lots to authenticated;
grant select, insert, update, delete on public.market_snapshots to authenticated;
grant select, insert, update, delete on public.monthly_analyses to authenticated;
grant select, insert, update, delete on public.tax_declaration_records to authenticated;

create policy "Users manage own investment lots"
  on public.investment_lots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own market snapshots"
  on public.market_snapshots
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own monthly analyses"
  on public.monthly_analyses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own tax records"
  on public.tax_declaration_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists investment_lots_user_date_idx
  on public.investment_lots(user_id, investment_date desc);

create index if not exists market_snapshots_user_fetched_idx
  on public.market_snapshots(user_id, fetched_at desc);

create index if not exists monthly_analyses_user_month_idx
  on public.monthly_analyses(user_id, month desc);

create index if not exists tax_records_user_year_idx
  on public.tax_declaration_records(user_id, fiscal_year desc);
