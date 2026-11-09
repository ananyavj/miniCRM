import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { registerSchema } from "./auth.schemas.js";
import { registerOwner } from "./auth.service.js";

const router = Router();

router.post(
    "/register",
    validate(registerSchema, "body"),
    async (req, res, _next) => {
        const result = await registerOwner(res.locals.body);
        res.status(201).json(result);
    },
);

export default router;
