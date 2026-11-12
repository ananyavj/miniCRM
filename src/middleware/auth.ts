// src/middleware/auth.ts

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors.js";
import { verifyAccessToken } from "../modules/auth/token.js";
import { getAuthenticatedUser } from "../modules/auth/auth.service.js";

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authorization = req.header("authorization");

    if (!authorization) {
        throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        throw new AppError(401, "AUTH_REQUIRED", "Authentication is required.");
    }

    let payload;

    try {
        payload = verifyAccessToken(token);
    } catch {
        throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token.");
    }

    const user = await getAuthenticatedUser(
        payload.userId,
        payload.organizationId,
    );

    res.locals.userId = user.id;
    res.locals.organizationId = user.organizationId;
    res.locals.role = user.role;

    next();
}
