# Vercel Deployment Checklist

Use this checklist when deploying the internal webmail app to Vercel with a Supabase Postgres database.

## 1. Prepare the database

- [ ] Create a Supabase project
- [ ] Open the project dashboard
- [ ] Copy the Postgres connection string for the pooled DB URL
- [ ] Copy the direct connection string for the non-pooled DB URL
- [ ] Save both values for the Vercel environment variables

Typical values:

- `DATABASE_URL`: pooled connection string (recommended for runtime)
- `DIRECT_URL`: direct connection string (recommended for Prisma migrations and schema pushes)

Example:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

## 2. Prepare the app

- [ ] Ensure the repo is pushed to GitHub
- [ ] Confirm the app uses Next.js and Prisma as expected
- [ ] Ensure `.env` is not committed to the repo in production
- [ ] Verify the project has a valid `vercel-build` script or build command

Recommended build script:

```json
"vercel-build": "prisma generate && prisma db push && next build"
```

## 3. Add environment variables in Vercel

In Vercel Project → Settings → Environment Variables, add:

- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `SESSION_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_WEBHOOK_SECRET`
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
- [ ] Confirm `prisma db push` succeeds
- [ ] Confirm the Next.js build succeeds

If the build fails, check:

- [ ] `DATABASE_URL` is valid
- [ ] `DIRECT_URL` is valid
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
- [ ] Prisma schema is applied
- [ ] Admin user can log in
- [ ] Mail UI and admin routes work
- [ ] Webhooks and outbound sending are validated
