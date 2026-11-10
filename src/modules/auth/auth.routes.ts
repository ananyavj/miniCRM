import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { registerSchema } from "./auth.schemas.js";
import { registerOwner } from "./auth.service.js";
import { loginSchema } from "./auth.schemas.js";
import { login } from "./auth.service.js";

const router = Router();

router.post(
    "/register",
    validate(registerSchema, "body"),
    async (req, res, _next) => {
        const result = await registerOwner(res.locals.body);
        res.status(201).json(result);
    },
);

router.post(
    "/login",
    validate(loginSchema, "body"),
    async (req, res, _next) => {
        const result = await login(res.locals.body);
        res.status(200).json(result);
    },
);

export default router;
