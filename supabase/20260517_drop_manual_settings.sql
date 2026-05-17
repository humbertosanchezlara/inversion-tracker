-- Remove manual rate overrides now that market, inflation, and tax inputs come from APIs.

drop table if exists public.app_settings;
