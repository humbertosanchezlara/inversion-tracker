# Inversion Tracker

Tracker personal para registrar inversiones mensuales en BONOS, UDIBONOS, CETES y BONDDIA, proyectar vencimientos y retornos, guardar datos fiscales para declaración anual y generar un análisis mensual con OpenAI.

## Local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Environment Variables

Copia `.env.example` a `.env.local` y configura:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5
INEGI_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` debe mantenerse solo server-side.

## Supabase

El schema inicial está en `supabase/schema.sql`. Para una base existente, corre también `supabase/20260517_add_cetes_bonddia_lots.sql` y `supabase/20260517_drop_manual_settings.sql`.
