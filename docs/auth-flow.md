# Auth flow (Days 21-25)

One page: how an account is created, how a token is issued, and how every protected request is checked. File names are in `code`.

## The pieces and where they live

| Piece | File | Job |
|---|---|---|
| `users` table | `db/migrations/005_users_auth.sql` | `password_hash` (nullable), `role` owner/member, email unique across ALL organizations |
| `hashPassword`, `verifyPassword` | `src/modules/auth/password.ts` | bcrypt, cost 12. No express, no database |
| `signAccessToken`, `verifyAccessToken` | `src/modules/auth/token.ts` | JWT, HS256, 1 hour, claims `sub` (user id), `org`, `role`. Payload checked with Zod |
| `registerSchema`, `loginSchema` | `src/modules/auth/auth.schemas.ts` | email trimmed + lowercased; password 8-72 (register) or 1-72 (login) |
| `createOrganizationWithOwner`, `findCredentialsByEmail`, `findUserById` | `src/modules/auth/auth.repository.ts` | SQL only. `findCredentialsByEmail` is the ONLY query that reads `password_hash` |
| `registerOwner`, `login`, `getAuthenticatedUser` | `src/modules/auth/auth.service.ts` | the rules: hash, check password, sign token, check user still exists |
| `POST /auth/register`, `POST /auth/login` | `src/modules/auth/auth.routes.ts` | HTTP only. Mounted at `/auth` in `app.ts`, with NO `requireAuth` |
| `requireAuth` | `src/middleware/auth.ts` | runs before every `/leads` route (and contacts, deals inside it) |
| `JWT_SECRET` | `.env`, `.env.test`, checked in `src/config.ts` (min 32) | signs and verifies tokens. Never committed |

## 1. Register: `POST /auth/register`

```
body { organizationName, name, email, password }
  -> auth.routes: validate(registerSchema, "body")      bad body / password < 8  -> 400 VALIDATION_ERROR
       cleaned body is in res.locals.body (NOT req.body)
  -> auth.service.registerOwner
       hashPassword(password)                            plain password stops here
       passes { organizationName, name, email, passwordHash }   (type: Omit<RegisterInput, "password"> & { passwordHash })
  -> auth.repository.createOrganizationWithOwner, inside withTransaction:
       BEGIN
       INSERT organizations ... RETURNING id, name
       INSERT users (..., password_hash, role 'owner') RETURNING public columns only
         email taken -> Postgres 23505 users_email_unique
       COMMIT                                            (or ROLLBACK: the organization disappears too)
  -> 201 { organization, user }                          no password, no hash
error path: 23505 -> withTransaction ROLLBACK + rethrow -> errorHandler -> 409 EMAIL_ALREADY_REGISTERED
```

## 2. Login: `POST /auth/login`

```
body { email, password }
  -> auth.routes: validate(loginSchema, "body") -> res.locals.body
  -> auth.service.login
       findCredentialsByEmail(email)  -> { user, passwordHash } or undefined
       no user / passwordHash NULL / verifyPassword false
            -> AppError 401 INVALID_CREDENTIALS "Invalid email or password."   (same answer for all three)
       signAccessToken({ userId, organizationId, role })
  -> 200 { accessToken, user }
```

## 3. Any protected request, e.g. `GET /leads/7`

```
header  Authorization: Bearer <token>
  -> leads.routes: router.use(requireAuth)
       requireAuth (src/middleware/auth.ts):
         no header / not "Bearer <token>"        -> 401 AUTH_REQUIRED
         verifyAccessToken throws (bad, expired) -> 401 INVALID_TOKEN      (only this call is inside try)
         getAuthenticatedUser(userId, org):
            user gone, or user.organizationId !== org -> 401 INVALID_TOKEN
            database down                            -> 500 (outside the try on purpose)
         res.locals.userId / organizationId / role  <- from the DATABASE user (fresh role)
         next()
  -> route reads res.locals.organizationId -> service -> repository: WHERE organization_id = $1
       lead belongs to another organization -> no row -> 404 (not 403: don't reveal it exists)
```

## Error codes in one place

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body fails Zod, or a `users_*` CHECK fails |
| 401 | `INVALID_CREDENTIALS` | login: unknown email, wrong password, or no password set |
| 401 | `AUTH_REQUIRED` | no `Authorization` header, or not `Bearer <token>` |
| 401 | `INVALID_TOKEN` | bad/expired token, user deleted, user moved to another organization |
| 404 | (resource) | another organization's lead, contact or deal |
| 409 | `EMAIL_ALREADY_REGISTERED` | register with an email that exists |

## Why each rule exists (one line each)

- Email unique across all organizations: login only has email + password, so the email alone must find one account.
- Hash, never store the password: if the database leaks, passwords don't.
- Same login error for everything: don't tell an attacker which emails are registered.
- JWT is signed, not encrypted: anyone can read it, nobody can change it without the secret. Put nothing secret in it.
- The organization comes from the token, never a header: the client can't edit a signed claim.
- Database check on every request: a token lives 1 hour; a deleted or moved user must stop working now.
- Role from the database, not the token: a role change takes effect immediately (used from Phase 6).

## Tests
`npm run migrate:test` after any new migration. Tests sign tokens for the seeded users directly (`org1` = Alice, `org2` = Bob in `app.test.ts`) because they know the test secret.
