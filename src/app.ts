import express , { type ErrorRequestHandler } from "express";
import leadRoutes from "./routes/leadRoutes.js"
import { NotFoundError, DuplicateIdError, ValidationError } from "./errors.js";

const app = express();
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/leads", leadRoutes);

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof NotFoundError) {
        res.status(404).json({ error: "Lead not found" });
    } else if (err instanceof ValidationError) {
        res.status(400).json({ error: "Invalid input" });
    } else if (err instanceof DuplicateIdError) {
        res.status(409).json({ error: "Lead already exists" });
    } else {
        res.status(500).json({ error: "Internal server error" });
    }
};
app.use(errorHandler);


app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

export default app;