import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors.js";
import { verifyAccessToken } from "../modules/auth/token.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.get("authorization");

    const parts = header?.split(" ");

    if (parts?.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
        throw new AppError(401, "AUTH_REQUIRED", "Authentication required.");
    }

    const token = parts[1];

    // The try wraps ONLY the call whose error we translate into INVALID_TOKEN.
    let payload: ReturnType<typeof verifyAccessToken>;

    try {
        payload = verifyAccessToken(token);
    } catch {
        throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token.");
    }

    res.locals.userId = payload.userId;
    res.locals.organizationId = payload.organizationId;
    res.locals.role = payload.role;

    next();
}
