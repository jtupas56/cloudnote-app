# FastAPI + React

## Configure Supabase Auth

The frontend uses Supabase's built-in email and password authentication. Copy
`.env.example` to `.env.local` and set the project URL and publishable key from
your Supabase project's API settings:

```bash
cp .env.example .env.local
```

In the Supabase dashboard, enable the Email provider and add the Vite local URL
(`http://localhost:5173/**`) under **Authentication → URL Configuration →
Redirect URLs**. Email confirmation follows your project's Supabase Auth
settings; when confirmation is required, the app asks the user to check their
email.

## Run locally

Start the backend from the `backend` directory:

```bash
uv run fastapi dev
```

In another terminal, start the frontend from the `frontend` directory:

```bash
npm run dev
```

Open the frontend URL printed by Vite. The Vite development server forwards
requests to `/api` to the FastAPI server at `http://127.0.0.1:8000`, where the
backend's `/` route provides the response.
