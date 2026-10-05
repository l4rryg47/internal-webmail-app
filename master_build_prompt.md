# Master Build Prompt: Internal Enterprise Webmail App

Copy everything below into your coding assistant (Claude Code, Cursor, etc.) as the project brief. It's written to be handed over as-is.

---

## Project Summary

Build a **web-only, self-hosted internal email client** for our organization. It is not a general-purpose mail client — it is the *only* interface our organization's staff will use to send and receive email on our domain. There is no IMAP/Exchange compatibility and no external mail client support by design. Email transport (sending and receiving) is handled via the **Resend API** (https://resend.com), not a self-hosted mail server.

Core principles for this build:
- **No public signup.** Accounts are created only by an admin.
- **Strict per-user mailbox isolation**, enforced server-side on every query — never trust a client-supplied user ID.
- **Keep scope disciplined.** Build the feature list below well rather than adding unlisted features. Flag anything you think is missing rather than silently adding it.

---

## Tech Stack

- **Frontend + Backend:** Next.js (App Router), TypeScript throughout
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Sessions:** server-side sessions stored in Postgres (or Redis if available), httpOnly + secure + SameSite=Strict cookies — **not** client-stored JWTs
- **Password hashing:** Argon2id (use the `argon2` npm package), not bcrypt
- **Email transport:** Resend API for sending; Resend inbound webhooks for receiving
- **File storage:** local disk under a configurable path for v1 (abstract this behind a storage interface so it can later swap to S3-compatible storage without touching business logic)
- **Validation:** Zod for all API input validation
- **Search:** PostgreSQL full-text search (`tsvector`/`tsquery`), no external search service for v1
- **Deployment target:** a single VPS, via Docker Compose (app container + Postgres container + reverse proxy)

If you think a different choice is clearly better for any of these, say so and explain the tradeoff before changing it — don't silently substitute.

---

## Data Model (Prisma schema, as a starting point)

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique   // the org address, e.g. jane@yourorg.com
  passwordHash  String
  displayName   String
  role          Role     @default(USER)
  signatureHtml String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  messages      Message[]
  threads       Thread[]
  rules         Rule[]
  sessions      Session[]
}

enum Role {
  ADMIN
  USER
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Thread {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  subject           String
  lastMessageAt     DateTime
  participantEmails String[]
  messages          Message[]

  @@index([userId, lastMessageAt])
}

model Message {
  id              String      @id @default(uuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  threadId        String
  thread          Thread      @relation(fields: [threadId], references: [id])
  folder          Folder      @default(INBOX)
  direction       Direction
  messageIdHeader String?     // RFC Message-ID header
  inReplyTo       String?
  references      String?
  fromAddress     String
  toAddresses     String[]
  ccAddresses     String[]
  subject         String
  bodyHtml        String
  bodyText        String
  isRead          Boolean     @default(false)
  isFlagged       Boolean     @default(false)
  resendId        String?     // Resend's own message/email id
  receivedAt      DateTime    @default(now())
  searchVector    Unsupported("tsvector")?

  attachments     Attachment[]

  @@index([userId, folder])
}

enum Folder {
  INBOX
  SENT
  DRAFTS
  TRASH
}

enum Direction {
  INBOUND
  OUTBOUND
}

model Attachment {
  id          String   @id @default(uuid())
  messageId   String
  message     Message  @relation(fields: [messageId], references: [id])
  filename    String
  contentType String
  sizeBytes   Int
  storagePath String
}

model Rule {
  id               String   @id @default(uuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  name             String
  enabled          Boolean  @default(true)
  priority         Int
  stopProcessing   Boolean  @default(false)
  conditionLogic   String   // "AND" | "OR" at top level; nested groups stored in conditions JSON
  conditions       Json     // see "Rule Condition Schema" below
  actions          Json
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([userId, priority])
}
```

Set up the `searchVector` column with a Postgres trigger (or a Prisma raw migration) that keeps it updated from `subject || ' ' || bodyText` on insert/update, and a GIN index on it for fast search.

---

## Rule Condition/Action Schema

Store as JSON so the UI can build nested groups without a schema migration later:

```json
{
  "logic": "AND",
  "groups": [
    {
      "logic": "OR",
      "conditions": [
        { "field": "from", "operator": "contains", "value": "@vendor.com" },
        { "field": "subject", "operator": "regex", "value": "^(Invoice|Receipt)" }
      ]
    }
  ]
}
```

- **Fields:** `from`, `to`, `cc`, `subject`, `body`, `hasAttachment`, `attachmentName`, `attachmentType`, `sizeBytes`.
- **Operators:** `equals`, `contains`, `startsWith`, `endsWith`, `regex`, `greaterThan`, `lessThan`.
- **Actions** (array, applied in order): `{ "type": "moveToFolder", "value": "TRASH" }`, `markAsRead`, `markAsUnread`, `flag`, `applyLabel` (if you add labels later), `stopProcessing`.
- **Regex safety:** use the `re2` npm package (Google's RE2 engine) for evaluating any user-supplied regex, never native JS `RegExp`, to prevent catastrophic backtracking from hanging the webhook handler.
- Rules are evaluated **synchronously inside the inbound webhook handler**, in `priority` order, immediately after the message and thread are persisted and before the client can see it — respecting `stopProcessing` to halt further rule evaluation for that message.

---

## Auth Requirements

1. **Login page** (`/login`): email + password form. No "sign up" link anywhere in the UI.
2. On failed login: increment a per-account failed-attempt counter with a time-decayed lockout (e.g., lock for 15 minutes after 5 failures within 10 minutes). Store this server-side, not in a cookie.
3. On success: create a `Session` row, set an httpOnly/secure/SameSite=Strict cookie containing only the session ID (not user data).
4. Every authenticated API route and page must resolve `userId` from the session server-side. **Never accept a user ID from the request body or query string for determining whose mailbox to read/write.**
5. `isActive: false` users must be rejected at login even with a correct password, and any existing sessions for a deactivated user should be invalidated immediately (delete their `Session` rows when an admin deactivates them).
6. Passwords: minimum length validation (e.g. 10+ characters) at signup/reset time; hash with Argon2id with sensible cost parameters (document whatever parameters you choose).
7. Provide a "change password" flow for logged-in users and a "reset password" action admins can trigger (generates a one-time reset token, does not email a plaintext password).

---

## Admin Panel (`/admin`, role === ADMIN only)

- List all users (email, display name, role, active status, created date) — **not** mailbox contents.
- Create user: input email (must match your verified domain), display name, role, and either set a temporary password or generate a reset link.
- Deactivate / reactivate a user.
- Trigger a password reset for a user.
- Enforce `role === ADMIN` server-side on every admin route — don't rely on hiding the `/admin` link in the UI as the actual access control.
- Admins do **not** have read access to other users' mailbox contents in this version — this is a deliberate scope boundary, flag clearly in code comments if this assumption is ever challenged.

---

## Mailbox Interface (authenticated pages)

- **Folder list:** Inbox, Sent, Drafts, Trash, with unread counts on Inbox.
- **Thread list** (per folder): subject, participants, snippet of last message, timestamp, unread indicator, flag indicator. Paginated/infinite-scroll, not loading the whole mailbox at once.
- **Thread view:** all messages in the thread in order, expand/collapse individual messages, attachments listed with download links, reply/reply-all/forward actions.
- **Compose:** to/cc/bcc, subject, rich text body (a lightweight HTML editor — e.g. Tiptap), attachment upload, and the user's stored signature auto-appended (editable before send).
- **Search:** a single search box querying the `tsvector` column across subject + body + from/to, scoped to the logged-in user's messages only.
- **Settings page:** edit signature, change password.
- **Rules page:** list/create/edit/delete rules, with a drag-or-numeric priority ordering control, and a "test rule against recent messages" dry-run view that shows which existing messages would match **without** applying actions.

---

## Sending Flow

1. User submits compose form → API route validates input with Zod (reject if `from` doesn't match the logged-in user's own address — **never trust a client-supplied `from`**).
2. Upload attachments to storage first, get back `storagePath`s.
3. Call Resend's send API with the composed message, attachments, and the user's signature appended to the HTML body.
4. On success, persist a `Message` row with `direction: OUTBOUND`, `folder: SENT`, and the `resendId` returned.
5. On failure, surface a clear error to the user and do not silently drop the compose — consider a Drafts fallback save so content isn't lost.

---

## Receiving Flow (Resend Inbound Webhook)

1. Set up a webhook endpoint (e.g. `/api/webhooks/resend`) and **verify the webhook signature** on every request — reject unverified requests outright (check Resend's current docs for their signature verification method/headers, since this is the kind of detail that can change — don't guess at it from memory).
2. Parse the `email.received` payload: `from`, `to`, `subject`, `html`/`text` body, headers (`Message-ID`, `In-Reply-To`, `References`), and attachment metadata.
3. Resolve the target `User` by matching the `to` address to `User.email`. If no match, log and discard (or store in a dead-letter table for investigation) — don't create orphaned messages.
4. Fetch and persist any attachments immediately (Resend's attachment URLs are temporary) to your storage layer.
5. Thread resolution: look for an existing `Thread` via `References`/`In-Reply-To` header match first; fall back to normalized-subject + participant match only if headers are absent; create a new `Thread` if neither matches.
6. Persist the `Message` row (`direction: INBOUND`, `folder: INBOX`), update the `Thread.lastMessageAt`.
7. Run the user's enabled `Rule`s in priority order against the new message, applying actions (e.g. moving it out of `INBOX` into `TRASH`, marking as read) before returning.
8. Respond `200` to Resend promptly — do any slow work (e.g. heavy attachment processing) off the critical path via a job queue if it risks exceeding Resend's webhook timeout; check Resend's current webhook retry/timeout documentation rather than assuming a specific number.

---

## Non-Functional Requirements

- All API routes must validate input with Zod and return structured error responses (consistent shape: `{ error: { code, message } }`).
- Rate-limit the login route and the webhook route separately from general API routes.
- Structured logging (e.g. pino) for all webhook events, rule executions, and auth events (login success/failure, admin actions) — no logging of full message bodies in plaintext logs, to limit blast radius if logs are ever exposed.
- Environment variables for all secrets (`RESEND_API_KEY`, `DATABASE_URL`, `SESSION_SECRET`, webhook signing secret, storage path) — provide a `.env.example`.
- Write a `docker-compose.yml` covering the app, Postgres, and a reverse proxy (Caddy recommended for automatic TLS) suitable for a single-VPS deployment.
- Include basic automated tests at minimum for: auth (login success/failure/lockout), mailbox isolation (user A cannot fetch user B's messages via the API even by guessing IDs), rule evaluation logic (given a message and a rule set, correct actions are produced), and webhook signature verification.

---

## Explicit Non-Goals for This Version

Do not build these — call them out if asked, but don't implement without being told to:
- IMAP/EWS/Exchange compatibility or any external mail client support
- Calendar, contacts, or tasks
- Shared/delegated mailboxes
- Two-factor authentication
- Admin read-access to other users' mail
- Multi-domain support (single verified sending/receiving domain only)

---

## Suggested Build Order

1. Postgres + Prisma schema + migrations
2. Auth: login, sessions, lockout, password hashing
3. Admin panel: user CRUD
4. Resend domain + webhook setup; inbound handler storing raw messages (no threading/rules yet)
5. Threading logic
6. Sending flow
7. Mailbox UI: folders, thread list, thread view, compose
8. Search
9. Rules engine + rules UI
10. Hardening: rate limiting, logging, tests, Docker Compose for deployment

Work through this in order and confirm each phase works end-to-end before moving to the next, rather than building all layers in parallel.
