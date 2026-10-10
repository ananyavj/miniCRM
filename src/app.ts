import express , { type ErrorRequestHandler } from "express";
import leadRoutes from "./routes/leadRoutes.js"
import { NotFoundError, DuplicateIdError, ValidationError } from "./errors.js";
import { requestLogger } from "./middleware/requestLogger.js";

const app = express();

app.use(requestLogger);
app.use(express.json({"limit" : "100kb"}));
app.use("/leads", leadRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err);
    if (
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        err.type === "entity.parse.failed"
    ) {
        res.status(400).json({ error: "Invalid JSON" });
        return;
    }
    else if (err instanceof NotFoundError) {
        res.status(404).json({ error: "Lead not found" });
    } else if (err instanceof ValidationError) {
        res.status(400).json({ error: "Invalid input" });
    } else if (err instanceof DuplicateIdError) {
        res.status(409).json({ error: "Lead already exists" });
    } else if(
        typeof err === "object" && 
        err !== null &&
        "type" in err &&
        err.type === "entity.too.large"
    ){
        res.status(413).json({error : "Request body too large"});
        return;
    }else {
        res.status(500).json({ error: "Internal server error" });
    }
};
app.use(errorHandler);


app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

export default app;