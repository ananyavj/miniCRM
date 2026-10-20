# MiniCRM API Design

## 1. API Endpoints

Example names and ids in this document come from the single reference dataset in `docs/data-model.md`.

| Operation | HTTP endpoint | Success status |
|---|---|---:|
| Health check | `GET /health` | 200 |
| Database health check | `GET /health/db` | 200 |
| List leads | `GET /leads` | 200 |
| Get one lead | `GET /leads/:id` | 200 |
| Create lead | `POST /leads` | 201 |
| Update lead status | `PATCH /leads/:id` | 200 |
| Assign a lead to a user | `PATCH /leads/:id/assignment` | 200 |
| Delete a lead | `DELETE /leads/:id` | 204 |
| List a lead's contacts | `GET /leads/:leadId/contacts` | 200 |
| Get one contact | `GET /leads/:leadId/contacts/:id` | 200 |
| Create a contact | `POST /leads/:leadId/contacts` | 201 |
| Update a contact | `PATCH /leads/:leadId/contacts/:id` | 200 |
| Delete a contact | `DELETE /leads/:leadId/contacts/:id` | 204 |
| List a lead's deals | `GET /leads/:leadId/deals` | 200 |
| Create a deal | `POST /leads/:leadId/deals` | 201 |
| Move a deal to a new stage | `PATCH /leads/:leadId/deals/:id/stage` | 200 |
| Delete a deal | `DELETE /leads/:leadId/deals/:id` | 204 |

### 1.1 Assign a Lead

**Endpoint:** `PATCH /leads/:id/assignment`

**Purpose:** Assign an existing lead to a user who belongs to the same organization as the lead.

**Required organization header:**

```http
x-org-id: 1
```

This header is a temporary development mechanism. It is not authentication and must eventually be replaced by organization identity derived from trusted authentication context.

**Request body:**

```json
{
  "userId": 1
}
```

The request schema requires `userId` to be a positive integer and rejects unexpected fields.

**Success response:** HTTP `200 OK`. The response contains the updated lead, including `assignedTo`, which is the user ID or `null` if the lead is unassigned. The assignment is stored in the database's `assigned_to` column. All lead responses include `assignedTo`.

**Validation and authorization rules:**

- The lead ID must be a positive integer.
- The request body must contain a valid positive integer `userId`.
- The lead must belong to the organization specified by the request context.
- The assigned user must belong to the same organization as the lead.
- The assignment operation runs inside a PostgreSQL transaction.
- If the lead or user cannot be found within the required organization, the assignment is rejected.

The transaction ensures that a failed assignment does not leave a partially completed update.

### 1.2 Contacts

Contacts are extra people attached to a lead, so their URLs sit under the lead. Contact and deal routers are mounted inside `leads.routes.ts` with `Router({ mergeParams: true })`, so they can read `:leadId`. The `x-org-id` header is required, and every query is scoped by organization and by lead.

- A contact in a response is `{ id, leadId, name, email, phone? }`. `phone` is left out when it is empty.
- `POST` body: `name` (required), `email` (required), `phone` (optional). Unknown fields are rejected.
- `PATCH` body: any of `name`, `email`, `phone`, and at least one must be sent. A phone number cannot currently be cleared back to empty (`COALESCE` keeps the old value).
- Creating or listing contacts for a lead that is missing, or belongs to another organization, returns 404.
- A second contact with the same email on the same lead returns 409 `DUPLICATE_CONTACT_EMAIL`.
- Deleting a lead that still has contacts returns 409 `LEAD_HAS_CONTACTS`.

Example from the reference dataset (`docs/data-model.md`): `POST /leads/5/contacts` with `{ "name": "Priya Nair", "email": "priya.nair@infosys.example" }` adds a contact to Rahul Sharma.

### 1.3 Deals

A deal is a possible sale attached to a lead. A deal in a response is `{ id, leadId, title, valueCents, stage }`. Money is stored as a whole number of cents (`valueCents`), never as a decimal, so there are no rounding errors.

- `POST` body: `title` (required, trimmed, not blank) and optional `valueCents` (a non-negative integer, default 0). A new deal always starts at stage `prospecting`.
- `PATCH .../stage` body: `{ "stage": "proposal" }`.
- Creating or listing deals for a missing lead returns 404, and so does a missing or foreign deal.
- Deleting a lead that still has deals returns 409 `LEAD_HAS_DEALS`.

**Stage rules.** The rules live in `deals.stages.ts` as a plain table and a pure `canTransition(from, to)` function. It has no database and no Express code, so it can be tested alone.

| From | May move to |
|---|---|
| `prospecting` | `proposal`, `lost` |
| `proposal` | `negotiation`, `lost` |
| `negotiation` | `won`, `lost` |
| `won` | nothing (final) |
| `lost` | nothing (final) |

Moving to the same stage is not allowed. A disallowed move returns 409 `INVALID_STAGE_TRANSITION`.

**Optimistic check.** The service reads the deal, checks `canTransition`, then the repository runs `UPDATE ... WHERE ... AND stage = <the stage we read>`. If two people change the same deal at once, only the first update finds the expected stage. The second updates no row and the API returns 409 `DEAL_CHANGED`.

Example from the reference dataset: `PATCH /leads/5/deals/1/stage` with `{ "stage": "won" }` succeeds only while "Cloud migration project" is in `negotiation`. From `prospecting` it returns 409.

## 2. Error Handling

The application uses centralized Express error-handling middleware to translate application and database errors into HTTP responses.

| Error condition | HTTP status | Response code |
|---|---:|---|
| Missing or invalid `x-org-id` header | 400 | `INVALID_ORG_ID` |
| Invalid request data detected by Zod | 400 | `VALIDATION_ERROR` |
| Invalid JSON body | 400 | `INVALID_JSON` |
| Invalid lead data rejected by service logic | 400 | `VALIDATION_ERROR` |
| Invalid lead status constraint | 400 | `INVALID_LEAD_STATUS` |
| Database validation constraint violation | 400 | `VALIDATION_ERROR` |
| Invalid assignment due to service validation | 400 | `VALIDATION_ERROR` |
| Invalid foreign key reference | 400 | `INVALID_REFERENCE` |
| Invalid assignee foreign key constraint | 400 | `INVALID_ASSIGNEE` |
| Required database field missing | 400 | `REQUIRED_FIELD_MISSING` |
| Lead, contact or deal not found within the organization | 404 | `NOT_FOUND` |
| Unknown route | 404 | `ROUTE_NOT_FOUND` |
| Duplicate lead email within an organization | 409 | `DUPLICATE_EMAIL` |
| Duplicate contact email on the same lead | 409 | `DUPLICATE_CONTACT_EMAIL` |
| Deleting a lead that still has contacts | 409 | `LEAD_HAS_CONTACTS` |
| Deleting a lead that still has deals | 409 | `LEAD_HAS_DEALS` |
| Deal stage change not allowed by the stage rules | 409 | `INVALID_STAGE_TRANSITION` |
| Deal changed by someone else during a stage change | 409 | `DEAL_CHANGED` |
| Request body exceeds configured limit | 413 | `BODY_TOO_LARGE` |
| Unexpected server error | 500 | `INTERNAL_SERVER_ERROR` |
| Database unavailable during health check | 503 | Database health response indicates unavailability |

Application errors share one base class, `AppError`, which carries `status`, `code` and `details`. `NotFoundError`, `ValidationError`, `DuplicateIdError` and `ConflictError` extend it, and `errorHandler` has a single `instanceof AppError` branch for all of them. A new error class gets a correct HTTP response automatically by extending `AppError`.

Database error mappings use PostgreSQL SQLSTATE codes and, where necessary, constraint names. Unknown PostgreSQL errors fall through to the generic server-error response.

A delete blocked by `ON DELETE RESTRICT` raises SQLSTATE `23001` (restrict_violation), not `23503`. The leads repository (the only layer that knows about Postgres) catches it in `deleteLead` and throws `ConflictError("LEAD_HAS_CONTACTS")` or `ConflictError("LEAD_HAS_DEALS")`, depending on the constraint name. The service layer and routes never see SQLSTATE codes.

Every error response follows this shape:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": []
  }
}
```

The exported `errorHandler` has tests for PostgreSQL error branches `23505`, `23514`, `23503` (including `INVALID_ASSIGNEE` and `INVALID_REFERENCE`), and `23502`, as well as the generic 500 response. These tests send errors directly through the exported handler.

For HTTP `500` responses, the API returns a generic error message instead of exposing raw SQL messages, stack traces, or internal implementation details.

## 3. Request and Response Flow

1. The client sends an HTTP request containing the method, URL, headers and, where applicable, a JSON request body.
2. Express middleware processes the request in registration order.
3. The organization middleware validates the temporary `x-org-id` header for lead routes, including the nested contact and deal routes.
4. Route-specific validation middleware validates request parameters, query parameters or body data using Zod schemas.
5. The route handler obtains validated data and the organization ID and calls the appropriate service function.
6. The service layer applies application rules and calls the database repository.
7. The repository executes parameterized PostgreSQL queries. Transactional operations use one checked-out database client for all queries in the transaction.
8. The route handler sends the appropriate HTTP response.
9. Errors forwarded to the centralized error handler are mapped to HTTP responses.

## 4. Validation Responsibilities

### 4.1 Request Validation — Zod

Zod validates incoming requests before the main route logic executes.

- `createLeadSchema` validates lead creation fields.
- `updateLeadStatusSchema` restricts status to `new`, `contacted`, `qualified` or `lost`.
- `leadIdSchema` validates positive integer lead IDs.
- `listLeadsQuerySchema` validates the optional lead-status filter.
- `assignLeadSchema` validates the positive integer `userId` used by the assignment endpoint.
- `createContactSchema` and `updateContactSchema` validate contact fields. The update schema makes every field optional but requires at least one.
- `leadParamsSchema` and `contactParamsSchema` validate the nested `:leadId` and `:id` URL parameters. `deals.schemas.ts` has its own `leadParamsSchema` and `dealParamsSchema`.
- `createDealSchema` validates deal creation, and `changeStageSchema` restricts `stage` to the five deal stages.

The reusable validation middleware stores validated data in `res.locals` for use by route handlers.

### 4.2 Service Validation — Business Rules

The service layer enforces application rules independently of HTTP request validation.

Lead assignment requires the assigned user to belong to the same organization as the lead. The repository checks this relationship as part of the transactional operation.

### 4.3 Database Validation — PostgreSQL

PostgreSQL enforces data integrity independently of the Express API.

The baseline schema includes constraints for required fields, lead status, nonblank lead names and company names, a basic email check, organization relationships and organization-scoped lead email uniqueness.

The `leads` table has a composite foreign key named `leads_assigned_to_org_fkey` on `(assigned_to, organization_id)`, referencing `(id, organization_id)` in `users`.

This prevents a lead from being assigned to a user belonging to another organization, even if a database write bypasses the application's service logic.

The constraint uses `ON DELETE SET NULL (assigned_to)`. When an assigned user is deleted, PostgreSQL clears the assignment without nulling the lead's required `organization_id`.

The application also checks organization membership during assignment. The application-level check provides clear behavior, while the composite foreign key independently protects database integrity.

## 5. Database Configuration and Transactions

The application loads and validates `DATABASE_URL` through its configuration module. `src/db/pool.ts` creates the shared PostgreSQL connection pool.

Ordinary repository operations use parameterized queries through the pool.

Transactional operations use `src/db/withTransaction.ts`, which:

1. Checks out a client from the pool.
2. Executes `BEGIN`.
3. Invokes a callback using that same client.
4. Executes `COMMIT` when the callback succeeds.
5. Attempts `ROLLBACK` when an operation fails.
6. Releases a healthy client to the pool or marks a client for destruction if rollback fails.

All queries that must belong to one transaction must use the same `PoolClient`. Using separate `pool.query()` calls inside the transaction would not guarantee that those queries execute within the same transaction.

Both the normal rollback path and the rollback-failure connection-disposal path have tests in `src/app.test.ts`. The rollback-failure test uses a fake client to exercise the failure path.

## 6. Database Schema and Migrations

Database schema files are organized as follows:

| File | Purpose |
|---|---|
| `db/migrations/001_baseline.sql` | Creates the baseline schema for organizations, users and leads. |
| `db/migrations/002_leads_id_org_unique.sql` | Adds the unique constraint on `(id, organization_id)` to support composite foreign-key references. |
| `db/migrations/003_contacts.sql` | Creates the contacts table and its constraints. |
| `db/migrations/004_deals.sql` | Creates the deals table and its constraints. |
| `db/seed.sql` | Provides seed data for development or test setup. |
| `src/db/migrate.ts` | Runs pending migrations and records their application. |

### 6.1 How Migrations Work

A migration is a versioned SQL change that establishes or evolves the database schema.

The migration runner:

1. Creates the `schema_migrations` tracking table if it does not exist.
2. Finds the `.sql` files in `db/migrations` and sorts them by filename.
3. Reads the migration filenames already recorded in `schema_migrations`.
4. Skips migrations that have already been applied.
5. Executes each pending migration inside a PostgreSQL transaction.
6. Records the migration filename in `schema_migrations` in the same transaction.
7. Reports errors and sets a nonzero process exit code if migration execution fails.

Recording the migration and executing its SQL in the same transaction ensures that a failed migration is not recorded as successfully applied.

Run migrations against the database configured by the application's environment:

```powershell
npm run migrate
```

To run migrations using `.env.test` in PowerShell:

```powershell
$env:DOTENV_CONFIG_PATH = ".env.test"
npm run migrate
Remove-Item Env:DOTENV_CONFIG_PATH
```

Always verify which database is configured before running migrations. Development and test databases maintain separate schemas and migration histories.

### 6.2 Contacts Table

The `contacts` table stores contact records associated with an organization and a lead.

| Column | Purpose |
|---|---|
| `id` | Generated contact identifier and primary key |
| `organization_id` | Organization that owns the contact |
| `lead_id` | Lead associated with the contact |
| `name` | Contact name; cannot be blank |
| `email` | Contact email, subject to the basic email check |
| `phone` | Optional phone number |

The table uses these constraints:

- `contacts_name_not_blank` rejects names that contain only whitespace.
- `contacts_email_check` requires an `@` in the email value.
- `contacts_lead_email_unique` prevents duplicate email values for the same lead.
- `contacts_organization_id_fkey` requires the organization to exist.
- `contacts_lead_org_fkey` requires the referenced lead to belong to the same organization as the contact.

The composite foreign key references `leads (id, organization_id)`. The corresponding unique constraint is added by `002_leads_id_org_unique.sql`.

Together, these constraints prevent a contact from referencing a lead belonging to another organization, even if application-level validation is bypassed.

The contact foreign keys use `ON DELETE RESTRICT` to prevent deleting referenced organizations or leads while dependent contacts remain.

### 6.3 Deals Table

The `deals` table stores possible sales attached to a lead.

| Column | Purpose |
|---|---|
| `id` | Generated deal identifier and primary key |
| `organization_id` | Organization that owns the deal |
| `lead_id` | Lead the deal is attached to |
| `title` | Deal title; cannot be blank |
| `value_cents` | Deal value in whole cents; default 0 |
| `stage` | Current stage; default `prospecting` |

Constraints:

- `deals_title_not_blank` rejects blank titles.
- `deals_value_cents_check` requires `value_cents >= 0`.
- `deals_stage_check` allows only `prospecting`, `proposal`, `negotiation`, `won` and `lost`.
- `deals_organization_id_fkey` requires the organization to exist (`ON DELETE RESTRICT`).
- `deals_lead_org_fkey` is a composite foreign key on `(lead_id, organization_id)` referencing `leads (id, organization_id)` with `ON DELETE RESTRICT`. A deal can never point at a lead from another organization, and a lead with deals cannot be deleted.

The database checks that a stage is one of the five valid values. The rules about which stage may follow which are application logic in `deals.stages.ts`.

### 6.4 Migration Verification

The following have been verified during Day 17:

- All three migrations ran successfully against the development database.
- All three migrations ran successfully against the test database.
- The migration tracking table contains the three applied migration filenames.
- A subsequent migration run skipped previously applied migrations.
- The contacts table and its constraints were inspected in PostgreSQL.
- A contact referencing a lead from another organization was rejected by `contacts_lead_org_fkey`.
- A valid same-organization contact insert succeeded during manual verification; the test insert was rolled back afterward.

## 7. Current Implementation Status

- PostgreSQL configuration and a shared connection pool are implemented.
- `GET /health/db` checks database connectivity.
- Lead listing, retrieval, creation, status updates and deletion use PostgreSQL-backed repository functions.
- Lead queries scope operations by organization ID.
- The test suite checks cross-organization lead read, update and delete protection.
- PostgreSQL errors are mapped to controlled HTTP responses for selected constraint violations.
- The lead-assignment endpoint validates the request and checks that the lead and assigned user belong to the same organization.
- Lead assignment uses a transaction and has tests for successful assignment, cross-organization rejection and nonexistent users.
- A transaction rollback test verifies that an update is undone when an error occurs after the update.
- A rollback-failure test verifies that the connection is discarded when rollback fails.
- The composite foreign key `leads_assigned_to_org_fkey` enforces same-organization assignment at the database level.
- The seed file has been corrected and tested against a disposable database; the five sample leads were verified to belong to the demo organization.
- The migration runner and three migrations have been verified against both development and test databases.
- A regression test verifies that a contact cannot reference a lead belonging to another organization.
- The contacts API (list, get, create, update, delete) is implemented in `src/modules/contacts/` and mounted under `/leads/:leadId/contacts`. Tests cover creating a contact, cross-organization rejection and the `LEAD_HAS_CONTACTS` conflict.
- The deals API (list, create, change stage, delete) is implemented in `src/modules/deals/`. Stage rules are in the pure `canTransition` function, which has its own database-free table test. HTTP tests cover create, a valid stage move, an invalid stage move and the `LEAD_HAS_DEALS` conflict.
- Application errors share the `AppError` base class and are handled by one branch in `errorHandler`.
- Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run format:check` for the current status. This document no longer states a test count, because the number changes as tests are added.

## 8. Known Limitations and Future Work

- The `x-org-id` header is temporary and must be replaced by organization identity derived from authenticated user context.
- Email validation currently checks only for the presence of `@`; it is not a complete email validation implementation.
- A contact's phone number cannot be cleared back to empty with `PATCH`.
- There is no HTTP test yet that a deal from another organization is hidden. Isolation for deals relies on the organization-scoped queries and the composite foreign key `deals_lead_org_fkey`.
- `isPostgresError` in `app.ts` still duplicates the idea of `isPgConstraintError` in `src/db/pgErrors.ts`. The two should be merged.
- Database error handling should be reviewed as new constraints and features are introduced, particularly to ensure that delete-restriction errors produce appropriate API responses.
