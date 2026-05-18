alter table public.investment_lots
  alter column investment_date drop not null,
  alter column maturity_date drop not null;

alter table public.investment_lots
  add constraint investment_lots_dates_required_except_bonddia
  check (
    instrument = 'BONDDIA'
    or (investment_date is not null and maturity_date is not null)
  );
