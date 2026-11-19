# Cloudnote backend

FastAPI validates the signed-in user's Supabase session at `GET /auth/me`.
It returns the authenticated account's ID and email; it does not list all
Supabase Auth users.

The backend loads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from
`backend/.env.local`. No service-role key is needed.

## Run locally

```bash
uv run fastapi dev
```

Restart the backend after editing `.env.local`. Run the frontend with
`npm run dev`, sign in, and select **Test FastAPI account lookup**. The
frontend sends the session token through `/api` to the backend.
