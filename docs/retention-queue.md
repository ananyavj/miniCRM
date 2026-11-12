# Retention Queue

Topics to re-do from memory, in order. A topic leaves the queue when you can write it blind and explain it in 5 sentences. Rows 8 to 14 were added after the Day 20 recall day (2026-11-08).

| # | Topic | Why it is here | Status |
|---|---|---|---|
| 1 | `src/db/pgErrors.ts`: narrowing `unknown` to check a Postgres error's `code` and `constraint` | Blind recall on Day 16 had gaps | open |
| 2 | SQLSTATE to HTTP mapping (23505 -> 409, 23514 -> 400, 23503 -> 400, 23502 -> 400, 23001 on delete -> 409) | Easy to mix up; `ON DELETE RESTRICT` raises 23001, not 23503 | open |
| 3 | Path of an error: Postgres -> repository (`ConflictError`) -> `errorHandler` -> 409 JSON | Day 18/19 repository translation | open |
| 4 | `AppError` and `ConflictError` classes, one `instanceof AppError` branch | Day 19 refactor | open |
| 5 | `canTransition` table and the optimistic `UPDATE ... AND stage = $from` | Day 19 | open |
| 6 | `src/db/migrate.ts` from memory (tracking table, sorted files, one transaction per migration) | Day 16 gap | open |
| 7 | `withTransaction` (BEGIN, COMMIT, ROLLBACK, release or destroy the client) | Syntax slips in the Day 16 attempt | open |
| 8 | `requireOrganization` from memory: header, Zod regex plus transform, `res.locals.organizationId`, standard `INVALID_ORG_ID` response | Day 20: concept fine, syntax unstable | open |
| 9 | `validate(schema, source)`: why it returns a function, what `RequestHandler`, `req, res, next` and `next(error)` mean | Day 20: needed a long explanation | open |
| 10 | `res.locals`: what is stored where (`params`, `body`, `query`, `organizationId`) | Day 20 | open |
| 11 | `ContactRow` (database row shape) vs `Contact` (API shape), `mapContactRow`, and Zod schema vs `z.infer` type | Day 20: mixed up types and runtime values | open |
| 12 | `RETURNING`, `result.rows`, `result.rows[0]!` (compile-time assertion, no runtime check) | Day 20 | open |
| 13 | SQLSTATE vs constraint name: `23001` says a RESTRICT rule blocked the delete; the constraint name says which table's rule | Day 20: misread 23001 as "lead has no contacts" | open |
| 14 | Debugging: first look where the error ORIGINATES (repository translation, service check), not where it is formatted (`errorHandler`) | Day 20: 4 of 7 first choices right | open |
| 15 | Why rules live in the database at all (constraints as the last line of defence), and how Postgres enforces them on INSERT/UPDATE | Day 21: self-reported as the shakiest area | open |
| 16 | Two databases, one migrate script: `dotenv/config` picks the DB from `DOTENV_CONFIG_PATH`, which stays set for the whole PowerShell window | Day 21: test DB was behind dev, tests failed until it was migrated | open |
| 17 | `bcrypt.compare` checks a password against a stored hash at login. It has nothing to do with the JWT secret; `jwt.verify` uses `JWT_SECRET` from `config` (`.env` or `.env.test`) | Day 26: mixed up bcrypt and JWT verification | open |
| 18 | `algorithms: ["HS256"]`: only accept the algorithm we sign with (blocks `alg: none` / algorithm confusion). JWT payloads never contain passwords or hashes | Day 26: B/C | open |
| 19 | Login timing: an unknown email skips `bcrypt.compare` and answers faster, which can reveal which emails exist. Fix: compare against a dummy hash anyway | Day 26: C | open |
| 20 | Layers: middleware and routes call SERVICES ("what are we doing"), services call REPOSITORIES ("how to talk to Postgres") | Day 26: C on why requireAuth calls a service | open |
| 21 | Debugging: everything suddenly 401 -> check auth config (`JWT_SECRET` in `.env.test`) before database data. Register 500 instead of 409 -> the 23505 + constraint-name branch in `errorHandler` | Day 26 Part 5: B/C on both | open |
| 22 | Where email is cleaned: Zod `.trim().toLowerCase()` in register AND login schemas, read from `res.locals.body` | Day 26 Part 5: B | open |
| 23 | DB row vs API object: `RETURNING` lists only public columns AND the repository builds a new object without `password_hash` | Day 26 Part 5: A/B | open |
| 24 | Exact schema details: the five `users` constraints from migration 005, and the columns/FKs of all five tables | Day 26: "some exact schema details" | open |
| 25 | **Deferred from Day 26 (Part 4, not done): glance-then-reproduce the 8 pieces**: `validate`, `withTransaction`, `hashPassword`/`verifyPassword`, `RegistrationData` (Omit) + two INSERTs, `signAccessToken`, `login` service, `requireAuth`, `errorHandler` 23505 branch | Ananya was too tired on 2026-11-12; moved to Day 30 by her decision | open, Day 30 first block |

## Scratch: Day 16 blind-recall attempts (unreviewed; they contain typos, for example an unclosed string in `BEGIN`)

import { z } from "zod";
import { Request, Response, NextFunction } from "express";
const organizationHeaderSchema = z.string().regex(/^[1-9]\d*$/).transform(Number);

export function requireOrganization(
    req : Request,
    res : Response,
    next : NextFunction
) {
    const result = organizationHeaderSchema.safeParse(req.get("x-org-id"));

    if(!result.success){
         res.status(400).json({
            error: {
                code: "INVALID_ORG_ID",
                message: "A valid x-org-id header is required.",
                details: []
            }
        });
        return;
    }

    res.locals.organizationId = result.data;
    next();
}

//validate

import type {RequestHandler} from "express";
import {z} from "zod";
import 

type requestSource = "body" | "params" | "query";

export function validate(
    schema : z.ZodType,
    source : requestSource
) : RequestHandler { return(req, res, next) => {
        const result = schema.safeParse(req[source]);
        if(!result.success)
        {
            return next(result.error);
        }
        res.locals[source] = result.data;
        next();
    }
}


import {z} from "zod"
//leadIdSchema
export const leadIdSchema = z.object({
    id : z.coerce.number().positive().int(),
}).strict();

//createLeadSchema
export const createLeadSchema = z.object({
    name : z.string().trim().min(1),
    email : z.email(),
    phone : z.string().optional(),
    company : z.string().trim().min(1),
}).strict();

//findLeadById
export async function findLeadById (organization_id: number, id : number) : Promise<Lead | undefined>{
    const result = await pool.query<LeadRow>(`
    SELECT id, name, email, phone, company, status, assigned_to
    FROM leads 
    WHERE id = $1 AND organization_id = $2`,
    [id, organization_id]
    );

    if(result.rows.length === 0)
    {
        return undefined;
    }
    return mapLeadRow(result.rows[0]!);
}

//createLead

type leadInput = Pick<Lead, "name" |"email" |"company"> & {phone? : string;}; 
export async function createLead (organizationId: number, input : leadInput) : Promise <Lead>
{
    const result = await pool.query<LeadRow>(`
        INSERT INTO leads (organization_id,name, email, company, phone) VALUES 
        ($1, $2, $3, $4, $5)
        RETURNING id, name, email, company, phone, status, assigned_to
    `,
    [organizationId,
            input.name,
            input.email,
            input.company,
            input.phone ?? null]
    );

    return mapLeadRow(result.rows[0]!);
}

//getLeadById
export async function getLeadById(organizationId :  number, id: number): Promise<Lead>{
    const leadObj = await findLeadById(organizationId, id);
    if(!leadObj)
    {
        throw new NotFoundError(`Lead with ID ${id} not found.`);
    }

    return leadObj;
}

//router.get /:id"
router.get("/:id", validate(leadIdSchema, "params"),async (req, res) => {
    const organizationId : number = res.locals.organizationId,
    const { id } : number = res.locals.params;
    const result = await getLeadById(organizationId, id);
    res.status(200).json(result);
})

//src/db/withTransaction.ts

export async function withTransaction<T> (callback : (client : PoolClient)=> Promise<T>) : Promise<T> {
    const client = await pool.connect();
    let destroyClient = false;
    try{
        await client.query("BEGIN);
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    }
    catch(error){
       try{
            await client.query("ROLLBACK");
        }
        catch(rollbackError){
            console.error("Transaction rollback failed:", rollbackError);
            destroyClient = true;
        }
        throw error;
    }
    finally{
        if(destroyClient){
            client.release(new Error("Transaction rollback failed"));
        }
        else{
            client.release();
        }
    }
}