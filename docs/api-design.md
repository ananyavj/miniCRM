# MiniCRM API Design

## 1. API Endpoints

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

### 1.1 Assign a Lead

**Endpoint:** `PATCH /leads/:id/assignment`

**Purpose:** Assigns an existing lead to a user who belongs to the same organization as the lead.

**Required organization header:**

`x-org-id: 1`

This header is a temporary development mechanism. It is not authentication and must eventually be replaced by organization identity derived from trusted authentication context.

**Request body:**

```json
{
  "userId": 1
}
```

The request schema requires `userId` to be a positive integer and rejects unexpected fields.

**Success response:** HTTP `200 OK`. The response contains the updated lead, including `assignedTo` (the user ID, or `null` if unassigned). The assignment is stored in the database's `assigned_to` column. All lead responses include `assignedTo`.

**Validation and authorization rules:**

- The lead ID must be a positive integer.
- The request body must contain a valid positive integer `userId`.
- The lead must belong to the organization specified by the request context.
- The assigned user must belong to the same organization as the lead.
- The assignment operation runs inside a PostgreSQL transaction.
- If the lead or user cannot be found within the required organization, the assignment is rejected.

The transaction ensures that a failed assignment does not leave a partially completed update.

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
| Lead not found within the organization | 404 | `NOT_FOUND` |
| Unknown route | 404 | `ROUTE_NOT_FOUND` |
| Duplicate lead email within an organization | 409 | `DUPLICATE_EMAIL` |
| Request body exceeds configured limit | 413 | `BODY_TOO_LARGE` |
| Unexpected server error | 500 | `INTERNAL_SERVER_ERROR` |
| Database unavailable during health check | 503 | Database health response indicates unavailability |

Database error mappings use PostgreSQL SQLSTATE codes and, where necessary, constraint names. Unknown PostgreSQL errors fall through to the generic server-error response.

Every error shape is `{ "error": { "code", "message", "details" } }`, including the organization-header error. Each PostgreSQL error branch (23505, 23514, 23503 for both `INVALID_ASSIGNEE` and `INVALID_REFERENCE`, 23502) and the generic 500 are tested by sending an error directly through the exported `errorHandler`.

For HTTP `500` responses, the API returns a generic error message instead of exposing raw SQL messages, stack traces, or internal implementation details.

## 3. Request and Response Flow

1. The client sends an HTTP request containing the method, URL, headers and, where applicable, a JSON request body.
2. Express middleware processes the request in registration order.
3. The organization middleware validates the temporary `x-org-id` header for lead routes.
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

The reusable validation middleware stores validated data in `res.locals` for use by route handlers.

### 4.2 Service Validation — Business Rules

The service layer enforces application rules independently of HTTP request validation.

Lead assignment requires the assigned user to belong to the same organization as the lead. The repository checks this relationship as part of the transactional operation.

### 4.3 Database Validation — PostgreSQL

PostgreSQL enforces data integrity independently of the Express API.

The schema includes constraints for required fields, lead status, nonblank names and company names, a basic email check, organization relationships and organization-scoped email uniqueness.

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

## 6. Current Implementation Status

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
- Test and typecheck results after the latest changes are pending (run `npm run typecheck; npm test`).
- The existing development and test databases still need to be inspected to confirm that their actual schemas match `src/db/schema.sql`.
