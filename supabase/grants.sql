-- Grants required when "Automatically expose new tables" is disabled.
-- Run in Supabase SQL Editor after schema.sql.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.investment_lots to authenticated;
grant select, insert, update, delete on public.market_snapshots to authenticated;
grant select, insert, update, delete on public.monthly_analyses to authenticated;
grant select, insert, update, delete on public.tax_declaration_records to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

grant usage, select on all sequences in schema public to authenticated;
