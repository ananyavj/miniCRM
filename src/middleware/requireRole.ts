import type { RequestHandler } from "express";
import type { Role } from "../modules/auth/auth.types.js";
import { ForbiddenError } from "../errors.js";

export function requireRole(...allowedRoles: Role[]): RequestHandler {
    return (_req, res, next) => {
        const role = res.locals.role as Role | undefined;

        if (!role || !allowedRoles.includes(role)) {
            throw new ForbiddenError(
                "You do not have permission to perform this action.",
            );
        }

        next();
    };
}
