-- Los movimientos asumían MXN como moneda de liquidación, pero una compra puede
-- liquidarse en USD u otra divisa. Se renombran las columnas para que dejen de
-- mentir sobre su moneda y se agrega quote_currency, con MXN como default para
-- que las filas existentes conserven su significado.

alter table public.asset_movements rename column unit_price_mxn to unit_price;
alter table public.asset_movements rename column amount_mxn to amount;

alter table public.asset_movements
  add column if not exists quote_currency text not null default 'MXN';

alter table public.asset_movements
  drop constraint if exists asset_movements_quote_currency_format;

alter table public.asset_movements
  add constraint asset_movements_quote_currency_format
  check (quote_currency ~ '^[A-Z]{3,5}$');

-- El check de "mes sin movimientos" referenciaba el nombre viejo de la columna.
alter table public.asset_movements
  drop constraint if exists asset_movements_none_stays_empty;

alter table public.asset_movements
  add constraint asset_movements_none_stays_empty
  check (kind <> 'NONE' or (occurred_at is null and asset is null and quantity is null and amount is null));
