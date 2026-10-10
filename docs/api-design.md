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