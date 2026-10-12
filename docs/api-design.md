Operation	        HTTP endpoint	        Success status
List leads	        GET /leads	            200
Get one lead	    GET /leads/:id	        200
Create lead	        POST /leads	            201
Update lead status	PATCH /leads/:id	    200
Delete lead	        DELETE /leads/:id	    204

======================================================================================================

Service error	    HTTP status	            Reason
ValidationError	    400	                    The client supplied invalid input.
NotFoundError	    404	                    The requested lead does not exist.
DuplicateIdError	409	                    The requested ID conflicts with an existing lead.
Unexpected error	500	                    The server encountered an unanticipated failure.


For a 500 response, the API returns a generic error message and does not expose internal error messages, stack traces, or implementation details.

Request and Response Flow

When a client sends a request, the server receives its HTTP method, URL, headers, and any request body. The server matches the method and URL to the appropriate route handler. The handler reads the required input and calls the relevant service function. The service performs the requested operation and returns data or reports an error. The handler sends an HTTP response containing the appropriate status code and, when applicable, a JSON response body.

## Three Things Express Does for Me

1. **Route matching:** In `rawServer.ts`, I manually check the request method and URL using `if` and `else if` statements. Express lets me register routes using methods such as `app.get()` and `router.get()`.

2. **Sending responses:** In the raw server, I use `res.writeHead()` to set the status and headers and `JSON.stringify()` to convert data into JSON. Express simplifies this with methods such as `res.status(200).json(data)`.

3. **Organising routes and handling errors:** Express lets me separate application setup, server startup, and lead routes into different files. It also supports centralised error-handling middleware, so I can map different errors to appropriate HTTP responses in one place.

## Validation Responsibilities

The API validates incoming requests at different layers. Each layer has a different responsibility.

### 1. Request validation — Zod schemas

Zod schemas validate incoming request data before it reaches the route handler's main logic.

- `createLeadSchema` validates the fields required to create a lead, including the name, email, and company.
- `updateLeadStatusSchema` ensures that the supplied status is one of the allowed values: `new`, `contacted`, `qualified`, or `lost`.
- `leadIdSchema` ensures that the lead ID is a positive integer.
- `listLeadsQuerySchema` validates the optional status filter when listing leads.

The reusable `validate` middleware checks the request data against the relevant schema. If validation fails, it forwards the error to the central error handler, which returns an appropriate HTTP response. If validation succeeds, the validated data is stored in `res.locals` for the route handler to use.

The schemas use `.strict()` where configured to reject unexpected fields.

### 2. Service validation — business logic

The service layer contains the application's operations and business rules. For example, `createLead` performs validation of the lead's name and email before creating a lead.

Some validation currently exists in both the request schemas and the service layer. This provides protection when the service is called from different parts of the application, rather than only through an HTTP route. However, the two layers should have clearly defined responsibilities to avoid unnecessary duplication.

### 3. Database validation — future PostgreSQL integration

The current application stores leads in memory. When PostgreSQL is introduced, the database should enforce important data rules as well.

Possible database constraints include:

- `NOT NULL` for required fields.
- A primary key for uniquely identifying each lead.
- A `UNIQUE` constraint on email if the application's requirements demand unique lead emails.
- A `CHECK` constraint for allowed lead statuses.

Request validation improves error handling by rejecting invalid input early. Database constraints provide an additional layer of protection and help maintain data integrity.

### Summary

- **Zod schemas:** Validate incoming request data.
- **Service layer:** Enforce application rules and protect operations called from different entry points.
- **PostgreSQL:** Enforce data integrity through database constraints.

These layers complement one another; request validation does not replace service checks or database constraints.

## Service-to-SQL Mapping

The current CRM uses in-memory data for lead operations. When PostgreSQL integration is introduced, the following SQL statements will replace the corresponding in-memory operations.

| Service operation                 |                                                   SQL statement |

| `getLeadById(id)`                 |                               `SELECT * FROM leads WHERE id = $1` |
| `listLeads()`                     |                                               `SELECT * FROM leads` |
| `createLead(...)`                 |                   `INSERT INTO leads (...) VALUES (...) RETURNING *` |
| `updateLeadStatus(id, status)`    |           `UPDATE leads SET status = $2 WHERE id = $1 RETURNING *` |
| `deleteLead(id)`                  |                       `DELETE FROM leads WHERE id = $1 RETURNING *` |

The `$1` and `$2` placeholders represent parameter values supplied separately to the SQL query. Parameterized queries help prevent SQL injection by keeping user-provided data separate from SQL instructions.

PostgreSQL integration will be implemented later; these statements document the planned mapping only.