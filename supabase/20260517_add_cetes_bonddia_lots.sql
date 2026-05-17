-- Enable CETES and BONDDIA in monthly investment lots and manual settings.
-- Run this once in the Supabase SQL Editor for existing projects.

alter table public.investment_lots
  drop constraint if exists investment_lots_instrument_check;

alter table public.investment_lots
  add constraint investment_lots_instrument_check
  check (instrument in ('BONOS', 'UDIBONOS', 'CETES', 'BONDDIA'));

alter table public.investment_lots
  alter column coupon_frequency_months drop not null;

alter table public.app_settings
  add column if not exists manual_cetes_rate numeric(10, 6),
  add column if not exists manual_bonddia_rate numeric(10, 6);

alter table public.monthly_analyses
  add column if not exists macro_summary text[] not null default '{}',
  add column if not exists curve_summary text[] not null default '{}',
  add column if not exists portfolio_summary text[] not null default '{}',
  add column if not exists action_items text[] not null default '{}',
  add column if not exists watch_conditions text[] not null default '{}';
