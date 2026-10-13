## API Endpoints

| Operation | HTTP endpoint | Success status |
|---|---|---|
| List leads | `GET /leads` | 200 |
| Get one lead | `GET /leads/:id` | 200 |
| Create lead | `POST /leads` | 201 |
| Update lead status | `PATCH /leads/:id` | 200 |
| Delete lead | `DELETE /leads/:id` | 204 |

## Error Handling

| Service error | HTTP status | Reason |
|---|---|---|
| `ValidationError` | 400 | The client supplied invalid input. |
| `NotFoundError` | 404 | The requested lead does not exist. |
| `DuplicateIdError` | 409 | The requested ID conflicts with an existing lead. |
| Unexpected error | 500 | The server encountered an unanticipated failure. |

For a 500 response, the API returns a generic error message and does not expose internal error messages, stack traces, or implementation details.

## Request and Response Flow

When a client sends a request, the server receives its HTTP method, URL, headers, and any request body. The server matches the method and URL to the appropriate route handler. The handler reads the required input and calls the relevant service function. The service performs the requested operation and returns data or reports an error. The handler sends an HTTP response containing the appropriate status code and, when applicable, a JSON response body.

## Three Things Express Does for Me

1. **Route matching:** In `rawServer.ts`, I manually check the request method and URL using `if` and `else if` statements. Express lets me register routes using methods such as `app.get()` and `router.get()`.

2. **Sending responses:** In the raw server, I use `res.writeHead()` to set the status and headers and `JSON.stringify()` to convert data into JSON. Express simplifies this with methods such as `res.status(200).json(data)`.

3. **Organising routes and handling errors:** Express lets me separate application setup, server startup, and lead routes into different files. It also supports centralised error-handling middleware, so I can map different errors to appropriate HTTP responses in one place.

## Validation Responsibilities

The CRM validates incoming requests at the API layer and enforces data integrity through service logic and PostgreSQL constraints. Each layer has a different responsibility.

### 1. Request Validation — Zod Schemas

Zod schemas validate incoming request data before it reaches the route handler's main logic.

- `createLeadSchema` validates the fields required to create a lead, including the name, email, and company.
- `updateLeadStatusSchema` ensures that the supplied status is one of the allowed values: `new`, `contacted`, `qualified`, or `lost`.
- `leadIdSchema` ensures that the lead ID is a positive integer.
- `listLeadsQuerySchema` validates the optional status filter when listing leads.

The reusable `validate` middleware checks request data against the relevant schema. If validation fails, it forwards the error to the central error handler. If validation succeeds, the validated data is stored in `res.locals` for the route handler to use.

The schemas use `.strict()` where configured to reject unexpected fields.

### 2. Service Validation — Business Logic

The service layer contains the application's operations and business rules. For example, `createLead` validates lead data before creating a lead.

Some validation currently exists in both the request schemas and the service layer. This provides protection when the service is called from different parts of the application, rather than only through an HTTP route. The two layers should have clearly defined responsibilities to avoid unnecessary duplication.

### 3. Database Validation — PostgreSQL Constraints

PostgreSQL independently enforces data integrity, including when data is written without going through the Express API. The following constraints are defined for the `leads` table:

- **`NOT NULL`:** Prevents required columns such as `name`, `email`, `company`, and `status` from containing `NULL`.
- **Primary key:** Uniquely identifies each lead through `id`.
- **`leads_status_check`:** Restricts `status` to `new`, `contacted`, `qualified`, or `lost`.
- **`leads_name_not_blank`:** Rejects empty or whitespace-only names using `btrim(name)`.
- **`leads_company_not_blank`:** Rejects empty or whitespace-only company names using `btrim(company)`.
- **`leads_email_check`:** Requires the email to contain an `@` character.
- **`leads_email_unique`:** Prevents duplicate email values across the entire `leads` table.

The `status` column defaults to `new`, and `created_at` defaults to the current timestamp.

The database email constraint is intentionally simpler than Zod's email validation. It only checks for an `@` character and does not guarantee that an address is a valid email format.

**Email uniqueness decision:** Email addresses are currently globally unique across all leads. This is enforced by `leads_email_unique`. When organizations are introduced, this decision should be revisited to determine whether uniqueness should remain global or apply separately within each organization.

### Summary

- **Zod schemas:** Validate incoming request data and provide early feedback.
- **Service layer:** Enforce application rules and protect operations called from different entry points.
- **PostgreSQL:** Independently enforce data integrity through database constraints.

These layers complement one another. Request validation does not replace service checks or database constraints.

## Service-to-SQL Mapping

The current CRM uses in-memory data for lead operations. The following SQL statements document the planned PostgreSQL mapping. Since leads will belong to organizations, queries that access lead data must also include an organization filter to enforce tenant isolation.

| Service operation | Planned SQL statement |
|---|---|
| `getLeadById(id, organizationId)` | `SELECT * FROM leads WHERE id = $1 AND organization_id = $2` |
| `listLeads(organizationId)` | `SELECT * FROM leads WHERE organization_id = $1` |
| `createLead(..., organizationId)` | `INSERT INTO leads (...) VALUES (...) RETURNING *` |
| `updateLeadStatus(id, status, organizationId)` | `UPDATE leads SET status = $2 WHERE id = $1 AND organization_id = $3 RETURNING *` |
| `deleteLead(id, organizationId)` | `DELETE FROM leads WHERE id = $1 AND organization_id = $2 RETURNING *` |

The `$1`, `$2`, and `$3` placeholders represent parameter values supplied separately to the SQL query. Parameterized queries help prevent SQL injection by keeping user-provided data separate from SQL instructions.

The organization filter is essential for multi-tenancy. A query that filters only by lead ID could return or modify another organization's lead if the caller supplies an ID belonging to that organization.

PostgreSQL integration and organization-aware service operations will be implemented in later stages. These statements document the intended mapping rather than completed application functionality.