import {z} from "zod";
import type {Request, Response, NextFunction} from "express";

const organizationHeaderSchema = 
    //TEMP : replaced by token on Day 24
    z.string().regex(/^[1-9]\d*$/).transform(Number);
    //One caveat: JavaScript numbers have a maximum safe integer. If we want to handle extremely large IDs robustly, we can add a safe-integer check later; ordinary organization IDs should be much smaller.


export function requireOrganization(
    req : Request,
    res : Response,
    next : NextFunction
){
    // TEMP: replaced by token on Day 24
    const result = organizationHeaderSchema.safeParse(req.get("x-org-id"));

    if(!result.success)
    {
        res.status(400).json({
            error: "INVALID_ORG_ID",
            message: "A valid x-org-id header is required."
        });
        return;
    }

    res.locals.organizationId = result.data;
    next();
}