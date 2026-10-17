# Retention Queue

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