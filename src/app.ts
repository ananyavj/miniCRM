import express , { type ErrorRequestHandler } from "express";
import leadRoutes from "./routes/leadRoutes.js"
import { NotFoundError, DuplicateIdError, ValidationError } from "./errors.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { ZodError } from "zod";

const app = express();

app.use(requestLogger);
app.use(express.json({"limit" : "100kb"}));
app.use("/leads", leadRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

const errorHandler : ErrorRequestHandler = (err, req, res, next) => {
    if(
        typeof err === "object" &&
        err !== null && "type" in err &&
        err.type === "entity.parse.failed"
    )
    {
        res.status(400).json({
            error: {
                code : "INVALID_JSON",
                message : "Request body contains invalid JSON",
                details : []
            } 
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
                details: []
            }
        });
        return;
    }

    if (err instanceof ZodError) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed",
                details: err.issues.map(issue => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            }
        });
        return;
    }

    if (err instanceof NotFoundError) {
        res.status(404).json({
            error: {
                code: "NOT_FOUND",
                message: err.message,
                details: []
            }
        });
        return;
    }

    if (err instanceof ValidationError) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: err.message,
                details: []
            }
        });
        return;
    }

    if (err instanceof DuplicateIdError) {
        res.status(409).json({
            error: {
                code: "DUPLICATE_ID",
                message: err.message,
                details: []
            }
        });
        return;
    }
    console.error(err);
    res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
            details: []
        }
    });
}
app.use(errorHandler);


app.use((req, res) => {
    res.status(404).json({
        error: {
            code: "ROUTE_NOT_FOUND",
            message: "Route not found",
            details: []
        }
    });
});

export default app;