import type { RequestHandler } from "express";
import type { z } from "zod";


type requestSource = "body" | "params" | "query";

export function validate(
    schema : z.ZodType,
    source : requestSource
) : RequestHandler {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if(!result.success)
        {
            return next(result.error);
        }
        res.locals[source] = result.data;
        next();
    };
}