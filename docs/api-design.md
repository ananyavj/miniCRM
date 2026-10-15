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
| Delete lead | `DELETE /leads/:id` | 204 |

**Implementation status:** `GET /health/db` executes a PostgreSQL query to verify database connectivity. The existing lead API routes still use in-memory data. Migrating those routes to PostgreSQL is planned for a later stage.

## 2. Error Handling

| Error | HTTP status | Reason |
|---|---:|---|
| `ValidationError` | 400 | The client supplied invalid input. |
| Zod validation error | 400 | Request data failed schema validation. |
| Malformed JSON | 400 | The request body contains invalid JSON. |
| `NotFoundError` | 404 | The requested lead does not exist. |
| `DuplicateIdError` | 409 | The requested ID conflicts with an existing lead. |
| Request body too large | 413 | The request body exceeds the configured limit. |
| Unexpected error | 500 | The server encountered an unanticipated failure. |
| Unknown route | 404 | No registered route matches the request. |

For a `500` response, the API returns a generic error message and does not expose internal error messages, stack traces, or implementation details.

## 3. Request and Response Flow

1. The client sends an HTTP request containing a method, URL, headers, and possibly a request body.
2. Express middleware processes the request in registration order.
3. Express matches the request to the appropriate route handler.
4. The handler reads validated input and calls the relevant service function.
5. The service performs the requested operation and returns data or reports an error.
6. The handler sends an HTTP response with the appropriate status code and, when applicable, a JSON response body.
7. Errors forwarded to the central error handler are mapped to consistent HTTP responses.

## 4. Three Things Express Does for Me

### 4.1 Route matching

In `rawServer.ts`, I manually check the request method and URL using `if` and `else if` statements. Express lets me register routes using methods such as `app.get()` and `router.get()`.

### 4.2 Sending responses

In the raw server, I use `res.writeHead()` to set the status and headers and `JSON.stringify()` to convert data into JSON. Express simplifies this with methods such as `res.status(200).json(data)`.

### 4.3 Organising routes and handling errors

Express lets me separate application setup, server startup, and lead routes into different files. It also supports centralised error-handling middleware, so I can map different errors to appropriate HTTP responses in one place.

## 5. Validation Responsibilities

The CRM validates incoming requests at the API layer and enforces data integrity through service logic and PostgreSQL constraints. Each layer has a different responsibility.

### 5.1 Request Validation — Zod Schemas

Zod schemas validate incoming request data before it reaches the route handler's main logic.

- `createLeadSchema` validates the fields required to create a lead, including the name, email, and company.
- `updateLeadStatusSchema` ensures that the supplied status is one of the allowed values: `new`, `contacted`, `qualified`, or `lost`.
- `leadIdSchema` ensures that the lead ID is a positive integer.
- `listLeadsQuerySchema` validates the optional status filter when listing leads.

The reusable `validate` middleware checks request data against the relevant schema. If validation fails, it forwards the error to the central error handler. If validation succeeds, the validated data is stored in `res.locals` for the route handler to use.

The schemas use `.strict()` where configured to reject unexpected fields.

### 5.2 Service Validation — Business Logic

The service layer contains the application's operations and business rules. For example, `createLead` validates lead data before creating a lead.

Some validation currently exists in both the request schemas and the service layer. This allows service functions to protect their own operations when called from different entry points, rather than relying exclusively on HTTP request validation. The two layers should have clearly defined responsibilities to avoid unnecessary duplication.

### 5.3 Database Validation — PostgreSQL Constraints

PostgreSQL independently enforces data integrity, including when data is written without going through the Express API.

The following constraints are defined for the `leads` table:

- **`NOT NULL`:** Prevents required columns such as `name`, `email`, `company`, `status`, and `organization_id` from containing `NULL`.
- **Primary key:** Uniquely identifies each lead through `id`.
- **`leads_status_check`:** Restricts `status` to `new`, `contacted`, `qualified`, or `lost`.
- **`leads_name_not_blank`:** Rejects empty or whitespace-only names using `btrim(name)`.
- **`leads_company_not_blank`:** Rejects empty or whitespace-only company names using `btrim(company)`.
- **`leads_email_check`:** Requires the email to contain an `@` character.
- **`leads_organization_email_unique`:** Enforces uniqueness on the combination of `organization_id` and `email`. The same email can exist in different organizations, but cannot appear more than once within the same organization.

The `status` column defaults to `new`, and `created_at` defaults to the current timestamp.

The database email constraint is intentionally simpler than Zod's email validation. It only checks for an `@` character and does not guarantee that an address is a valid email format.

**Email uniqueness decision:** Email uniqueness is organization-scoped rather than global. This allows two organizations to independently track the same person as a lead. It also avoids revealing whether another organization already has a lead with a particular email through a global duplicate-email constraint.

The database also enforces organization relationships:

- **`users_organization_id_fkey`:** Requires each user to reference an existing organization. `ON DELETE RESTRICT` prevents deleting an organization while users still reference it.
- **`leads_organization_id_fkey`:** Requires each lead to reference an existing organization. `ON DELETE RESTRICT` prevents deleting an organization while leads still reference it.
- **`leads_assigned_to_fkey`:** Requires a non-null `assigned_to` value to reference an existing user. Because the column is nullable, leads may remain unassigned. `ON DELETE SET NULL` preserves a lead if its assigned user is deleted.

**Known limitation — cross-organization assignments:** The current `leads_assigned_to_fkey` checks only whether the assigned user exists. It does not enforce that the user belongs to the same organization as the lead. A lead belonging to organization 1 could therefore be assigned to a user belonging to organization 2.

A composite foreign key is planned for Day 21 to enforce that a lead and its assigned user belong to the same organization.

### 5.4 Validation Summary

- **Zod schemas:** Validate incoming request data and provide early feedback.
- **Service layer:** Enforce application rules and protect operations called from different entry points.
- **PostgreSQL:** Independently enforce data integrity through database constraints.

These layers complement one another. Request validation does not replace service checks or database constraints.

## 6. Database Configuration and Connection Management

The application loads environment variables through `dotenv` and validates `DATABASE_URL` using Zod in `src/config.ts`.

The connection string belongs in `.env`, which must not be committed to Git. `.env.example` documents the required variable using a placeholder rather than a real password.

`src/db/pool.ts` creates a shared PostgreSQL connection pool using the validated connection string. The pool manages reusable database connections, and `pool.query(text, values)` executes parameterized SQL.

A standalone script should call `pool.end()` when finished so the pool can close its connections. A long-running server should not close the shared pool after each request.

### Database health check

`GET /health/db` executes a simple query to check database connectivity. A successful HTTP `200` response with the following JSON confirms that the application executed the health-check query successfully at the time of the request:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## 7. PostgreSQL Lead Repository

The repository layer in `src/db/leadRepository.ts` provides organization-aware read operations. Both functions below have been exercised against the existing PostgreSQL seed data.

The existing Express lead routes have **not yet** been migrated to use these functions.

### 7.1 `listLeadsByOrg(organizationId, status?)`

Returns an array of leads belonging to the specified organization. If `status` is supplied, the results are additionally filtered by that status. Results are ordered by lead ID.

```sql
SELECT id, name, email, company, phone, status
FROM leads
WHERE organization_id = $1
  AND ($2::text IS NULL OR status = $2)
ORDER BY id;
```

The parameter values are supplied separately:

```ts
[organizationId, status ?? null]
```

If the status is omitted, the `NULL` parameter disables the optional status filter.

### 7.2 `findLeadById(organizationId, id)`

Returns the matching lead if it belongs to the specified organization. If no matching row exists—including when the ID belongs to another organization—the function returns `undefined`.

```sql
SELECT id, name, email, company, phone, status
FROM leads
WHERE organization_id = $1 AND id = $2;
```

The parameter values are supplied separately:

```ts
[organizationId, id]
```

The organization condition is essential. Looking up a lead using only its ID would not enforce tenant isolation. With both conditions present, a request scoped to organization 2 cannot retrieve organization 1's lead through this repository function.

The repository maps database rows to the application's TypeScript `Lead` shape. A nullable database `phone` value is omitted from the returned object when it is `NULL`.

### 7.3 Not-found behaviour

`findLeadById` returns `undefined` when no row matches both the organization ID and lead ID.

The caller is responsible for deciding how that result maps to an HTTP response. The repository itself does not send an HTTP response or throw the application's `NotFoundError`.

### 7.4 Parameterized Queries and SQL Injection

The `$1` and `$2` placeholders represent values supplied separately to PostgreSQL. Parameterized queries keep user-provided values separate from SQL instructions and help prevent SQL injection.

A read-only experiment demonstrated the difference:

- Concatenating the input `1 OR 1=1` into a query caused the condition to become `id = 1 OR 1=1`, which returned all five seeded leads.
- Passing the same input through a `$1` parameter did not execute it as SQL syntax. PostgreSQL rejected it as invalid integer input.

This experiment was performed in a temporary script, not in the application repository.

Parameterization does not replace input validation. It prevents input from changing the query's structure, while validation checks whether the input is acceptable for the operation.

## 8. Service-to-SQL Mapping

The current lead API routes still use in-memory data. The following table describes the intended organization-aware PostgreSQL mapping for operations planned for later stages. It does not claim that all these database operations are already implemented.

| Service operation | Planned SQL statement |
|---|---|
| `findLeadById(organizationId, id)` | `SELECT id, name, email, company, phone, status FROM leads WHERE organization_id = $1 AND id = $2` |
| `listLeadsByOrg(organizationId, status?)` | `SELECT id, name, email, company, phone, status FROM leads WHERE organization_id = $1 AND ($2::text IS NULL OR status = $2) ORDER BY id` |
| Create a lead | `INSERT INTO leads (organization_id, name, email, company, status) VALUES ($1, $2, $3, $4, $5) RETURNING *` |
| Update lead status | `UPDATE leads SET status = $1 WHERE organization_id = $2 AND id = $3 RETURNING *` |
| Delete a lead | `DELETE FROM leads WHERE organization_id = $1 AND id = $2 RETURNING *` |
| Get an organization by ID | `SELECT * FROM organizations WHERE id = $1` |
| List users in an organization | `SELECT * FROM users WHERE organization_id = $1` |

The organization filter must be applied to lead reads, updates, and deletes. The organization ID must eventually come from trusted authentication context, not blindly from an untrusted client-supplied value.

Repository-level filtering is an important layer of tenant isolation, but it does not by itself establish that the caller is authorised to act for that organization.

## 9. Current Implementation Status

- PostgreSQL configuration and a shared connection pool are implemented.
- `GET /health/db` returned HTTP `200` with a successful database status.
- `listLeadsByOrg` and `findLeadById` are implemented and have been exercised against the existing seed data.
- Manual repository checks confirmed that organization 1 returned its own leads and that organization 2 could not retrieve lead ID 1 through `findLeadById`.
- The existing Express API test suite passed **17 tests**, and `npm run typecheck` completed without reporting errors after the repository changes.
- The SQL injection comparison was run successfully as a demonstration.
- The existing lead API routes still use in-memory data. Migrating them to PostgreSQL and adding automated repository tests remain future work.
