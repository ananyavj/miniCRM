// src/middleware/middleware.test.ts
// Unit tests: each middleware is called directly with fake req/res/next objects.
// No server, no database: we only check what the middleware itself does.
import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { validate } from "./validate.js";
import { requireRole } from "./requireRole.js";
import { ForbiddenError } from "../errors.js";

function fakeRes(locals: Record<string, unknown> = {}) {
    return { locals } as unknown as Response;
}

describe("validate middleware", () => {
    const schema = z.object({ name: z.string().trim().min(1) }).strict();

    // Proves: valid input is CLEANED (trimmed) and stored in res.locals, then next() runs with no error.
    it("stores the cleaned body in res.locals and calls next()", () => {
        const req = { body: { name: "  Ravi  " } } as unknown as Request;
        const res = fakeRes();
        const next = vi.fn();

        validate(schema, "body")(req, res, next as unknown as NextFunction);

        expect(res.locals.body).toEqual({ name: "Ravi" });
        expect(next).toHaveBeenCalledWith();
    });

    // Proves: invalid input goes to next(error) as a ZodError, and nothing is stored.
    it("passes a ZodError to next() and leaves res.locals empty", () => {
        const req = { body: { name: "" } } as unknown as Request;
        const res = fakeRes();
        const next = vi.fn();

        validate(schema, "body")(req, res, next as unknown as NextFunction);

        expect(res.locals.body).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]![0]).toBeInstanceOf(ZodError);
    });
});

describe("requireRole middleware", () => {
    const req = {} as Request;

    // Proves: an allowed role passes straight through.
    it("lets an allowed role through", () => {
        const next = vi.fn();

        requireRole("owner")(
            req,
            fakeRes({ role: "owner" }),
            next as unknown as NextFunction,
        );

        expect(next).toHaveBeenCalledWith();
    });

    // Proves: a role that isn't allowed is stopped with a 403, and next() never runs.
    it("throws ForbiddenError for a role that isn't allowed", () => {
        const next = vi.fn();

        expect(() =>
            requireRole("owner")(
                req,
                fakeRes({ role: "member" }),
                next as unknown as NextFunction,
            ),
        ).toThrow(ForbiddenError);
        expect(next).not.toHaveBeenCalled();
    });

    // Proves: if requireAuth didn't run first (no role at all), access is still refused.
    it("throws ForbiddenError when there is no role at all", () => {
        expect(() =>
            requireRole("owner")(
                req,
                fakeRes(),
                vi.fn() as unknown as NextFunction,
            ),
        ).toThrow(ForbiddenError);
    });

    // Proves: requireRole(...roles) accepts ANY of the roles listed.
    it("accepts any of several allowed roles", () => {
        const next = vi.fn();

        requireRole("owner", "member")(
            req,
            fakeRes({ role: "member" }),
            next as unknown as NextFunction,
        );

        expect(next).toHaveBeenCalledWith();
    });
});
