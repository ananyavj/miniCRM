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

**Success response:** HTTP `200 OK`. The response contains the updated lead, including its existing lead fields. The assignment is stored in the database's `assigned_to` column.

**Validation and authorization rules:**

- The lead ID must be a positive integer.
- The request body must contain a valid positive integer `userId`.
- The lead must belong to the organization specified by the request context.
- The assigned user must belong to the same organization as the lead.
- The assignment operation runs inside a PostgreSQL transaction.
- If the lead or user cannot be found within the required organization, the assignment is rejected.

The database transaction ensures that a failed assignment does not leave a partially completed update.

## 2. Error Handling

The application uses centralized Express error-handling middleware to translate application and database errors into HTTP responses.

| Error condition | HTTP status | Response code |
|---|---:|---|
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

The database error mappings are based on PostgreSQL SQLSTATE codes and, where necessary, constraint names. Unknown PostgreSQL errors fall through to the generic server-error response.

Not every mapping has yet been independently tested through an HTTP request. The duplicate-email HTTP response and selected PostgreSQL constraint errors have been tested; additional HTTP-level coverage remains pending.

For HTTP `500` responses, the API returns a generic error message instead of exposing raw SQL messages, stack traces or internal implementation details.

## 3. Request and Response Flow

1. The client sends an HTTP request containing the method, URL, headers and, where applicable, a JSON request body.
2. Express middleware processes the request in registration order.
3. The organization middleware validates the temporary `x-org-id` header for lead routes.
4. Route-specific validation middleware validates request parameters, query parameters or body data using Zod schemas.
5. The route handler obtains the validated data and organization ID and calls the appropriate service function.
6. The service layer applies application rules and calls the database repository.
7. The repository executes parameterized PostgreSQL queries. Transactional operations use one checked-out database client for all queries in the transaction.
8. The route handler sends the appropriate HTTP response.
9. Errors forwarded to the centralized error handler are mapped to consistent HTTP responses.

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

The existing `leads_assigned_to_fkey` checks that the assigned user exists, but by itself it does not ensure that the user belongs to the same organization as the lead.

Application-level assignment logic checks organization membership. A composite foreign key is being considered to enforce this relationship at the database level as well; it should not be described as implemented until the schema change and its tests are complete.

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

The normal rollback path has been tested. The rollback-failure connection-disposal path is subject to a separate test.

## 6. Current Implementation Status

- PostgreSQL configuration and a shared connection pool are implemented.
- `GET /health/db` checks database connectivity.
- Lead listing, retrieval, creation, status updates and deletion use PostgreSQL-backed repository functions.
- Lead queries scope operations by organization ID.
- The test suite checks cross-organization lead read, update and delete protection.
- PostgreSQL errors are mapped to controlled HTTP responses for selected constraint violations.
- The lead-assignment endpoint validates the request and checks that the lead and assigned user belong to the same organization.
- Lead assignment uses a transaction and has integration tests for successful assignment, cross-organization rejection and nonexistent users.
- A transaction rollback test verifies that an update is undone when an error occurs after the update.
- The reported test suite passed 34 tests, and TypeScript typechecking passed after the transaction-helper import correction.
- The composite foreign key and a test for rollback failure are not yet verified as complete.
