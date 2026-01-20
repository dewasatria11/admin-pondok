# Admin Pondok

Admin-only endpoint to wipe Supabase Storage and database tables in one request.

## Setup

1) Install deps
```
npm install
```

2) Create `.env.local`
```
SUPABASE_URL=https://sxbvadzcwpaovkhghttv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_WIPE_TOKEN=your_admin_wipe_token
```

3) Create SQL function in Supabase (SQL Editor)
```
create or replace function public.admin_wipe_db()
returns void
language sql
security definer
as $$
  truncate table public.pembayaran, public.pendaftar restart identity cascade;
$$;

revoke all on function public.admin_wipe_db() from public;
```

## Run locally
```
npm run dev
```

Test endpoint:
```
curl -X POST http://localhost:3000/api/admin/wipe -H "x-admin-token: <token>"
```

## Deploy to Vercel

- Import repo in Vercel.
- Set env vars in Vercel:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_WIPE_TOKEN`
- Deploy.

## Security

- Do not commit `.env.local`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_WIPE_TOKEN` secret.
