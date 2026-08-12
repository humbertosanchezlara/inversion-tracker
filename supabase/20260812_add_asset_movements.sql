-- Movimientos fuera del universo gubernamental (cripto, efectivo en exchange, etc).
-- Se guardan aparte de investment_lots a propósito: no tienen plazo, vencimiento,
-- cupón ni retención Art. 24 LIF, así que no deben entrar a proyección, estimación
-- fiscal ni al análisis mensual, que solo consideran BONOS/UDIBONOS/CETES/BONDDIA.
--
-- kind = 'NONE' marca explícitamente un mes sin movimientos.

create table if not exists public.asset_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  occurred_at timestamptz,
  kind text not null check (kind in ('DEPOSIT', 'BUY', 'SELL', 'WITHDRAWAL', 'NONE')),
  asset text,
  quantity numeric(28, 8) check (quantity >= 0),
  unit_price_mxn numeric(20, 6) check (unit_price_mxn >= 0),
  amount_mxn numeric(18, 2) check (amount_mxn >= 0),
  fee_amount numeric(28, 8) check (fee_amount >= 0),
  fee_asset text,
  venue text,
  notes text,
  created_at timestamptz not null default now(),
  constraint asset_movements_asset_required_unless_none
    check (kind = 'NONE' or asset is not null),
  constraint asset_movements_none_stays_empty
    check (kind <> 'NONE' or (occurred_at is null and asset is null and quantity is null and amount_mxn is null))
);

-- Un mes no puede estar marcado como "sin movimientos" más de una vez.
create unique index if not exists asset_movements_no_activity_unique
  on public.asset_movements(user_id, month)
  where kind = 'NONE';

create index if not exists asset_movements_user_month_idx
  on public.asset_movements(user_id, month desc);

alter table public.asset_movements enable row level security;

grant select, insert, update, delete on public.asset_movements to authenticated;
grant select, insert, update, delete on public.asset_movements to service_role;

drop policy if exists "Users manage own asset movements" on public.asset_movements;

create policy "Users manage own asset movements"
  on public.asset_movements
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
