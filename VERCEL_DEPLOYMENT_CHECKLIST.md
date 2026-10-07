# Vercel Deployment Checklist

Use this checklist when deploying the internal webmail app to Vercel with a Supabase Postgres database.

## 1. Prepare the database

- [ ] Create a Supabase project
- [ ] Open the project dashboard
- [ ] In Supabase → Connect, select the Session pooler connection string (port `5432`); use it for `DIRECT_URL`
- [ ] Use the Transaction pooler connection string (port `6543`) for `DATABASE_URL`
- [ ] Use the pooler-provided username (commonly `postgres.[PROJECT-REF]`) and URL-encode special characters in the password
- [ ] Save both values for the Vercel environment variables

Typical values:

- `DATABASE_URL`: transaction pooler (recommended for serverless runtime)
- `DIRECT_URL`: session pooler (for Prisma database operations; direct database host may not be reachable from some Vercel build environments)

Example:

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
```

## 2. Prepare the app

- [ ] Ensure the repo is pushed to GitHub
- [ ] Confirm the app uses Next.js and Prisma as expected
- [ ] Ensure `.env` is not committed to the repo in production
- [ ] Verify the project has a valid `vercel-build` script or build command

The Vercel build must not apply database changes. Vercel runs builds for previews and production, and tying compilation to a reachable database can make deployments hang or fail. The project build script should only generate Prisma Client and compile Next.js:

```json
"vercel-build": "prisma generate && next build"
```

Apply the Prisma schema separately from a trusted local machine with the project environment loaded:

```powershell
npm run db:push
```

The Supabase CLI can authenticate and link the Supabase project, but it does not apply `prisma/schema.prisma` itself. Use Prisma CLI for the schema operation. To authenticate/link the project:

```powershell
supabase login
supabase projects list
supabase link --project-ref <PROJECT-REF>
```

Keep credentials in local `.env` or your secret manager; never paste connection strings into chat or commit them.

## 3. Add environment variables in Vercel

In Vercel Project → Settings → Environment Variables, add:

- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `SESSION_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_WEBHOOK_SECRET`
- [ ] `CRON_SECRET`
- [ ] `MAIL_PULSE_FROM_EMAIL`
- [ ] `MAIL_PULSE_FROM_NAME`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `STORAGE_PATH`
- [ ] `LOG_LEVEL`
- [ ] `BOOTSTRAP_ADMIN_EMAIL`
- [ ] `BOOTSTRAP_ADMIN_NAME`
- [ ] `BOOTSTRAP_ADMIN_PASSWORD`

Recommended values:

```env
SESSION_SECRET="replace-with-strong-secret"
RESEND_API_KEY="re_123"
RESEND_WEBHOOK_SECRET="replace-with-webhook-secret"
CRON_SECRET="replace-with-a-long-random-secret"
MAIL_PULSE_FROM_EMAIL="admin@llctuar.com"
MAIL_PULSE_FROM_NAME="Webmail Mail Pulse"
STORAGE_PATH="./storage"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
LOG_LEVEL="info"
BOOTSTRAP_ADMIN_EMAIL="admin@yourorg.com"
BOOTSTRAP_ADMIN_NAME="System Administrator"
BOOTSTRAP_ADMIN_PASSWORD="AdminPassword123!"
```

## 4. Configure the Vercel project

- [ ] Import the GitHub repo
- [ ] Select the correct framework preset: Next.js
- [ ] Confirm the root directory is the project root
- [ ] Set the build command if needed
- [ ] Set the install command if needed
- [ ] Use the production branch that should deploy
- [ ] Save the project settings

## 5. Run the first deployment

- [ ] Trigger a production deployment
- [ ] Watch the Vercel build logs
- [ ] Confirm Prisma generation succeeds
- [ ] Confirm the Next.js build succeeds

If the build fails, check:

- [ ] `DATABASE_URL` is the Supabase transaction pooler URL on port `6543`
- [ ] `DIRECT_URL` is the Supabase session pooler URL on port `5432`
- [ ] Prisma schema is valid
- [ ] No unsupported Prisma features are being used in the runtime environment

## 6. Post-deploy verification

- [ ] Open the deployed app URL
- [ ] Log in with the bootstrap admin values
- [ ] Verify the dashboard loads
- [ ] Verify the mail page loads
- [ ] Verify the admin page loads
- [ ] Test creating or resetting a user
- [ ] Verify send/inbound routes work in the hosted environment
- [ ] Confirm the Resend webhook URL is configured correctly

To receive inbound mail, configure a receiving domain in Resend and its required MX record, then add a webhook targeting `https://your-app.vercel.app/api/webhooks/resend` with the `email.received` event enabled. Set `RESEND_WEBHOOK_SECRET` to that webhook's signing secret. Resend sends message metadata to the webhook; the app uses `RESEND_API_KEY` to retrieve the full email before saving it, and routes it using the `received_for` and `to` recipient addresses.

The Mail Pulse cron runs daily at 09:00 UTC and checks the persisted six-day schedule. Add a long random `CRON_SECRET` to Vercel so the scheduled endpoint is protected. Set `MAIL_PULSE_FROM_EMAIL` to an address on a domain verified for sending in Resend; the countdown is visible on the Admin page. Vercel Hobby cron jobs run once daily with up to about 59 minutes of timing variance, so a due heartbeat may wait until the next daily check. Apply the Prisma schema update separately with `npm run db:push` before deploying this feature.

## 7. Production hardening

- [ ] Replace default admin credentials immediately after first login
- [ ] Set strong `SESSION_SECRET`
- [ ] Keep `RESEND_WEBHOOK_SECRET` private
- [ ] Restrict database access in Supabase to only the app needs
- [ ] Confirm HTTPS is enabled through Vercel
- [ ] Verify emails and webhook callbacks hit the correct production domains

## 8. Final sign-off

- [ ] App is reachable on Vercel
- [ ] Database is reachable through Supabase
- [ ] Prisma schema was applied separately before first use
- [ ] Admin user can log in
- [ ] Mail UI and admin routes work
- [ ] Webhooks and outbound sending are validated
