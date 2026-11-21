# Deploying Handshake

Two services and one database. Account steps (sign-ups, dashboards, secrets) are for a human. Agents never handle secrets.

| Piece | Where | Region |
|---|---|---|
| Web (`apps/web`, Next.js) | Vercel | any (edge) |
| API (`apps/server`, Fastify) | Render or Railway web service | **Singapore**, next to Supabase and Nexconn SG |
| Database | Supabase Postgres (existing project) | Singapore |

## 1. Database

1. Supabase dashboard → the project → **Restore** if it says *Paused*. Free projects pause after 7 idle days.
2. Copy the pooler URL (port 6543, `?pgbouncer=true`) as `DATABASE_URL`.

## 2. API (Render example; Railway is the same idea)

- New **Web Service** from the GitHub repo, region **Singapore**.
- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @convocart/contracts build && pnpm --filter @convocart/server db:generate && pnpm --filter @convocart/server build`
- Start: `pnpm --filter @convocart/server start`
- Health check path: `/health`

Environment variables:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` (the platform sets `PORT`) |
| `WEB_ORIGIN` | the Vercel URL, e.g. `https://handshake.vercel.app` (comma-separate several; the first is used for demo photo links) |
| `DATABASE_URL` | from step 1 |
| `SESSION_SECRET` | 32+ random characters |
| `AGENT_ACCESS_CODE` | the code support agents type to sign in |
| `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET` | the **production** Nexconn app (D-008) |
| `NEXCONN_AREA` | `SG` |
| `LLM_API_KEY` | Gemini key |
| `SEAL_SIGNING_SEED` | 64 hex characters: `openssl rand -hex 32`. Keep it forever: changing it breaks every printed Seal QR |

## 3. Seal public key

The web checks Seal signatures with the public key that matches `SEAL_SIGNING_SEED`. Once the API is up:

```bash
curl https://<api-host>/api/seals/key
```

Copy `publicKey` into the web's `NEXT_PUBLIC_SEAL_PUBLIC_KEY`. Without it, the web uses the dev key and every production Seal shows "Don't trust this link".

## 4. Web (Vercel)

- Import the repo, **Root Directory** `apps/web`, framework Next.js.
- Install: `cd ../.. && corepack enable && pnpm install --frozen-lockfile`
- Build: `cd ../.. && pnpm --filter @convocart/contracts build && pnpm --filter @convocart/web build`

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<api-host>` (no trailing slash) |
| `NEXT_PUBLIC_SEAL_PUBLIC_KEY` | from step 3 |

`NEXT_PUBLIC_*` values are baked in at build time: **redeploy** after changing them.

## 5. Nexconn console

- Webhook / message callback URL: `https://<api-host>/api/webhooks/nexconn`.
- Check Call/VoIP is enabled if the call feature should work (error 80006 means it is off).

## 6. Keep it awake

Add a free uptime monitor (UptimeRobot, Better Stack) hitting `https://<api-host>/health` every 5 minutes. It keeps Render's free tier warm and gives Supabase daily activity so it doesn't pause again.

## 7. Check the Golden Path on the live URL

1. `/try` → **Watch both sides at once**: type as Priya, see Japanese on Kenji's side.
2. Agree a Deal Card on both sides, open the Seal, scan the QR with a phone: green "Signed by Handshake".
3. **Get help** → case appears for the agent at `/agent`, resolve it.
4. Refresh any page: history is still there.
