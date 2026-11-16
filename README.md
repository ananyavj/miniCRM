# MiniCRM

A multi-tenant CRM backend built with TypeScript, Express and PostgreSQL.
Organizations manage leads, contacts, deals, activity and reminders. Every request is authenticated, and every record is isolated to its own organization.

**Live:** https://minicrm-gd2p.onrender.com (free hosting: the first request after 15 idle minutes takes about a minute while the server wakes up)

---

## Highlights

- **Multi-tenant isolation.** The organization always comes from the signed token, never from the request. Every query is scoped by `organization_id`, composite foreign keys stop records from ever pointing across organizations, and another organization's records return `404`.
- **Authentication.** Passwords hashed with bcrypt; HS256 JWT access tokens (1 hour); on every request the token's user is re-checked in the database, so deleted or moved users stop working immediately.
- **Roles.** `owner` and `member`. Only owners can delete records, add members or change roles, and an organization can never lose its last owner. Roles are read from the database, not the token, so a promotion or demotion takes effect at once.
- **Leads.** Search across name, email and company; filter by status and assignee; whitelisted sorting; pagination with a total count.
- **Contacts, deals, activity.** Contacts per lead; deals with a one-way stage pipeline (`prospecting -> proposal -> negotiation -> won`, or `lost` from any open stage); a log of calls, emails, meetings and notes.
- **History.** Every lead status change is recorded (who, from, to, when) in the same transaction as the change.
- **Reminders.** Timezone-safe due dates (any offset in, UTC out) and a background worker that sends due reminders exactly once, even with several workers running (`FOR UPDATE SKIP LOCKED`).
- **Tested.** 250 automated tests: unit tests, HTTP tests, attack tests, and permission/tenancy test tables that check every protected route.

## Tech stack

TypeScript, Node.js, Express 5, PostgreSQL (`pg`), Zod, jsonwebtoken, bcryptjs, Vitest + Supertest, ESLint + Prettier. Deployed on Render (server) with Neon (Postgres).

---

## Architecture

Each feature is a module with the same four layers. Requests only ever flow downward:

```
routes       HTTP only: validate input, call a service, send the response
   |
services     the rules: "does this lead exist in your organization?", "only owners", hashing
   |
repositories SQL only: parameterized queries, transactions, mapping rows to API objects
   |
PostgreSQL   constraints are the last line of defence
```

ESLint enforces the boundaries: routes can't import repositories, and services and repositories can't import Express.

**One request, end to end** (`GET /leads/7` with a token):

```
express.json, requestLogger
requireAuth      Bearer token? signature and expiry valid? user still exists in that organization?
                 -> res.locals = { userId, organizationId, role }   (from the database)
validate         Zod checks and cleans params/query/body -> res.locals.params
route            listLeads / getLeadById(res.locals.organizationId, ...)
service          business rules, throws NotFoundError / ForbiddenError / ConflictError
repository       SELECT ... WHERE id = $1 AND organization_id = $2
errorHandler     every error becomes { "error": { "code", "message", "details" } }
```

## Security notes

- The organization is never taken from a header, query or body. `.strict()` schemas reject unknown fields, so `organizationId`, `role` or `userId` can't be smuggled into a request.
- Cross-organization access returns `404`, not `403`, so it doesn't even reveal that a record exists.
- Login returns the same `401 INVALID_CREDENTIALS` for an unknown email, a wrong password or an account without a password.
- `verifyAccessToken` only accepts HS256 (rejects `alg: none`) and validates the token's contents with Zod.
- Passwords and hashes are never selected except by the single login query, and never returned.
- Settings are validated at startup; the app refuses to start with a missing or malformed setting.
- Unexpected errors are logged on the server and answered with a generic `500`. The `X-Powered-By` header is disabled.

---

## Roles and permissions

| Action | Owner | Member |
|---|---|---|
| List, create, update leads; change status; assign | yes | yes |
| Add and edit contacts; add deals; move deal stages | yes | yes |
| Log activities; add and complete reminders; list users | yes | yes |
| **Delete** a lead, contact or deal | yes | 403 |
| Add a member, change a role | yes | 403 |

## API

All endpoints except `/`, `/health*` and `/auth/*` need `Authorization: Bearer <accessToken>`.
Errors always look like `{ "error": { "code": "...", "message": "...", "details": [] } }`.

### Auth and health

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/health/db` | database connectivity |
| POST | `/auth/register` | `{ organizationName, name, email, password }`: creates the organization and its owner in one transaction. `409 EMAIL_ALREADY_REGISTERED` |
| POST | `/auth/login` | `{ email, password }` -> `{ accessToken, user }` |

### Users

| Method | Path | Notes |
|---|---|---|
| GET | `/users` | your organization's users |
| POST | `/users` | owner only: `{ name, email, password }` adds a member |
| PATCH | `/users/:id/role` | owner only: `{ role }`. `409 LAST_OWNER` if it would leave no owner |

### Leads

| Method | Path | Notes |
|---|---|---|
| GET | `/leads` | `?q=&status=&assignedTo=&sort=id\|name\|company\|createdAt&order=asc\|desc&limit=1-100&page=` -> `{ items, total, page, limit }` |
| POST | `/leads` | `{ name, email, company, phone? }` |
| GET | `/leads/:id` | |
| PATCH | `/leads/:id` | `{ status }`: `new`, `contacted`, `qualified`, `lost`; writes a history row |
| PATCH | `/leads/:id/assignment` | `{ userId }`: must be a user in your organization |
| DELETE | `/leads/:id` | owner only. `409` if the lead still has contacts or deals |
| GET | `/leads/:id/history` | status changes, oldest first |

### Attached to a lead

| Method | Path | Notes |
|---|---|---|
| GET, POST | `/leads/:leadId/contacts` | `{ name, email, phone? }` |
| GET, PATCH | `/leads/:leadId/contacts/:id` | |
| DELETE | `/leads/:leadId/contacts/:id` | owner only |
| GET, POST | `/leads/:leadId/deals` | `{ title, valueCents? }`, starts at `prospecting` |
| PATCH | `/leads/:leadId/deals/:id/stage` | `{ stage }`, `409` for an invalid transition |
| DELETE | `/leads/:leadId/deals/:id` | owner only |
| GET, POST | `/leads/:leadId/activities` | `{ type: call\|email\|meeting\|note, note? }`, newest first |
| GET, POST | `/leads/:leadId/reminders` | `{ title, dueAt }`: ISO 8601 with a timezone, in the future |
| PATCH | `/leads/:leadId/reminders/:id/done` | |

Ready-made requests for VS Code's REST Client are in [`docs/requests.http`](docs/requests.http).

---

## Data model

```
organizations ─┬─ users                (email unique across ALL organizations; role owner|member)
               └─ leads ─┬─ contacts            (RESTRICT: a lead with contacts can't be deleted)
                         ├─ deals               (RESTRICT)
                         ├─ activities          (CASCADE: deleted with the lead)
                         ├─ lead_status_history (CASCADE)
                         └─ reminders           (CASCADE; partial index on pending reminders)
```

Child tables reference `(lead_id, organization_id)` together, so the database itself refuses a record that points at another organization's lead. Schema changes are numbered SQL files in `db/migrations`, applied once each and recorded in `schema_migrations`. More detail in [`docs/data-model.md`](docs/data-model.md).

---

## Running it locally

**Requirements:** Node.js 20.6 or newer, PostgreSQL 15 or newer.

```bash
git clone https://github.com/ananyavj/miniCRM.git
cd miniCRM
npm install
```

Create two databases, one for development and one for tests (the tests refuse to run against any database not named `minicrm_test`):

```sql
CREATE DATABASE minicrm;
CREATE DATABASE minicrm_test;
```

Copy `.env.example` to `.env` and to `.env.test`, then fill them in. Generate each secret with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

```
# .env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/minicrm
JWT_SECRET=<64 hex characters>

# .env.test
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/minicrm_test
JWT_SECRET=<a different secret>
```

Then:

```bash
npm run migrate        # create the tables in minicrm
npm run migrate:test   # create the tables in minicrm_test
npm run dev            # API on http://localhost:3000
npm run worker         # optional: the reminder worker, in a second terminal
npm test               # 250 tests
```

### Scripts

| Script | What it does |
|---|---|
| `dev` | run the API with auto-reload (tsx) |
| `build` / `start` | compile `src` to `dist`, then run it with Node (production) |
| `worker` | run the reminder worker |
| `test` | run all tests (Vitest) |
| `typecheck`, `lint`, `format`, `format:check` | TypeScript, ESLint, Prettier |
| `migrate`, `migrate:test`, `migrate:prod` | apply migrations to the dev, test or production database (each prints which database it is changing) |

## Testing

- **HTTP tests** send real requests through the whole app with Supertest against a real Postgres test database, which is reset before every test.
- **Unit tests** check single pieces directly: middleware with fake requests, Zod schemas, token helpers, the deal stage rules, the settings check.
- **Attack tests** try to break in: self-promotion, forged roles, mixing your own IDs with another organization's, smuggled fields, an unsigned `alg: none` token.
- **Test tables** run one rule against every protected route: no token gives `401`; another organization gives `404` and changes nothing; owner vs member gives the permission table above.

## Deployment

The API runs on **Render** and the database on **Neon**.
Render builds with `npm install --include=dev && npm run build` and starts with `npm start`, health-checking `/health`. Its environment holds `NODE_ENV=production`, `DATABASE_URL` and `JWT_SECRET`; Render supplies `PORT`.
Migrations are applied from a development machine with `npm run migrate:prod`, which reads a git-ignored `.env.production`.
The reminder worker isn't deployed, because the free plan has no background workers; it runs with `npm run worker` anywhere that can reach the database.

## Project structure

```
db/migrations/        numbered SQL migrations (001-010)
docs/                 data model, auth flow, request examples
src/
  app.ts              Express app: middleware, routers, errorHandler
  server.ts           starts the app, graceful shutdown
  config.ts           validated settings
  home.ts             the welcome page at /
  errors.ts           AppError and its subclasses
  db/                 pool, withTransaction, migrate, pgErrors
  middleware/         requireAuth, requireRole, validate, requestLogger
  jobs/worker.ts      reminder worker
  modules/
    auth/  users/  leads/  contacts/  deals/  activities/  reminders/
        *.routes.ts  *.schemas.ts  *.service.ts  *.repository.ts  *.types.ts
```

## Known limitations

- Tokens can't be revoked before they expire, except by deleting the user (which every request checks).
- No refresh tokens, rate limiting or password reset.
- Login answers slightly faster for unknown emails, which could reveal which emails exist (a dummy bcrypt comparison would fix this).
- The free hosting plan sleeps when idle, and the reminder worker isn't deployed there.
