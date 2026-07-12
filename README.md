# The Vault — Watch Collection

A personal watch-collection tracker. Catalogue your timepieces, keep a wishlist, and let AI fetch full technical specifications for any watch — including brand-new releases — via Google-grounded search.

Built with **React 18 + Vite**, **Supabase** (auth + Postgres), and the **Gemini API** (grounded search for specs).

## Setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Configure environment variables** — copy `.env.example` to `.env` and fill in your Supabase project values:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   > These are required — the app throws on startup without them. When deploying (e.g. Vercel), set both variables in the project's environment settings.

3. **Run**

   ```sh
   npm run dev      # local dev server
   npm run build    # production build
   npm run lint     # ESLint
   ```

## Supabase schema

The app expects a `watches` table:

| column    | type      | notes                          |
|-----------|-----------|--------------------------------|
| `id`      | `text`    | primary key, client-generated  |
| `user_id` | `uuid`    | references `auth.users`        |
| `brand`   | `text`    |                                |
| `model`   | `text`    |                                |
| `ref`     | `text`    | reference number               |
| `year`    | `text`    |                                |
| `dial`    | `text`    |                                |
| `list`    | `text`    | `'collection'` or `'wishlist'` |
| `image`   | `text`    | URL or data URI                |
| `notes`   | `text`    |                                |
| `specs`   | `jsonb`   | technical specifications       |
| `ts`      | `bigint`  | added-at timestamp (ms)        |

**Row Level Security must be enabled** — the anon key is public, so RLS is the only thing keeping collections private:

```sql
alter table watches enable row level security;

create policy "Users manage own watches"
  on watches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Gemini API key

Each user's Gemini API key is stored in their Supabase auth `user_metadata` under `gemini_key`, e.g.:

```sql
-- via Supabase dashboard: Authentication → Users → edit user metadata
{ "gemini_key": "AIza..." }
```

The app caches it in `localStorage` and sends it via the `x-goog-api-key` header, calling the Gemini API directly from the browser.

## Features

- **Add a watch** — type brand + model; grounded Gemini search fills in the specs.
- **Collection & Wishlist** — two lists, with one-click move from wishlist to collection.
- **Photos** — upload from device (compressed client-side) or paste an image URL.
- **Notes** — personal notes per watch.
- **Export / Import** — JSON backup and restore in Settings.
