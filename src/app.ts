// src/app.ts
import express, { type ErrorRequestHandler } from "express";
import leadRoutes from "./modules/leads/leads.routes.js";
import { AppError } from "./errors.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { ZodError } from "zod";
import { pool } from "./db/pool.js";

const app = express();

app.use(requestLogger);
app.use(express.json({ limit: "100kb" }));
app.use("/leads", leadRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/health/db", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "ok",
            database: "connected",
        });
    } catch (error) {
        console.error("Database Health Check Failed", error);

        res.status(503).json({
            status: "error",
            database: "unavailable",
        });
    }
});

function isPostgresError(err: unknown): err is {
    code: string;
    constraint?: string;
} {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof err.code === "string"
    );
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    if (
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        err.type === "entity.parse.failed"
    ) {
        res.status(400).json({
            error: {
                code: "INVALID_JSON",
                message: "Request body contains invalid JSON",
                details: [],
            },
        });
        return;
    }

    if (
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        err.type === "entity.too.large"
    ) {
        res.status(413).json({
            error: {
                code: "BODY_TOO_LARGE",
                message: "Request body is too large",
                details: [],
            },
        });
        return;
    }

    if (err instanceof ZodError) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed",
                details: err.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            },
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.status).json({
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
        return;
    }

    if (isPostgresError(err)) {
        const { code, constraint } = err;

        if (
            code === "23505" &&
            constraint === "leads_organization_email_unique"
        ) {
            res.status(409).json({
                error: {
                    code: "DUPLICATE_EMAIL",
                    message:
                        "A lead with this email already exists in this organization.",
                    details: [],
                },
            });
            return;
        }

        if (code === "23505" && constraint === "contacts_lead_email_unique") {
            res.status(409).json({
                error: {
                    code: "DUPLICATE_CONTACT_EMAIL",
                    message:
                        "A contact with this email already exists for this lead.",
                    details: [],
                },
            });
            return;
        }

        if (code === "23514" && constraint === "leads_status_check") {
            res.status(400).json({
                error: {
                    code: "INVALID_LEAD_STATUS",
                    message:
                        "Lead status must be new, contacted, qualified, or lost.",
                    details: [],
                },
            });
            return;
        }

        if (
            code === "23514" &&
            (constraint === "leads_name_not_blank" ||
                constraint === "leads_company_not_blank" ||
                constraint === "leads_email_check")
        ) {
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Lead data violates a validation rule.",
                    details: [],
                },
            });
            return;
        }

        if (
            code === "23514" &&
            (constraint === "deals_title_not_blank" ||
                constraint === "deals_value_cents_check" ||
                constraint === "deals_stage_check")
        ) {
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Deal data violates a validation rule.",
                    details: [],
                },
            });
            return;
        }

        if (code === "23503") {
            const isAssignmentError =
                constraint === "leads_assigned_to_org_fkey";

            res.status(400).json({
                error: {
                    code: isAssignmentError
                        ? "INVALID_ASSIGNEE"
                        : "INVALID_REFERENCE",
                    message: isAssignmentError
                        ? "The assigned user does not exist."
                        : "A referenced record does not exist.",
                    details: [],
                },
            });
            return;
        }

        if (code === "23502") {
            res.status(400).json({
                error: {
                    code: "REQUIRED_FIELD_MISSING",
                    message: "A required field is missing.",
                    details: [],
                },
            });
            return;
        }
    }

    console.error(err);

    res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
            details: [],
        },
    });
};

app.use(errorHandler);

app.use((req, res) => {
    res.status(404).json({
        error: {
            code: "ROUTE_NOT_FOUND",
            message: "Route not found",
            details: [],
        },
    });
});

export default app;
