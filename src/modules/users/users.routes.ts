import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listMembers } from "./users.service.js";
import { createMemberSchema } from "./users.schemas.js";
import { createMember } from "./users.service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
    const users = await listMembers(res.locals.organizationId);

    res.status(200).json(users);
});

router.post("/", validate(createMemberSchema, "body"), async (req, res) => {
    const user = await createMember(res.locals.organizationId, res.locals.body);

    res.status(201).json(user);
});

export default router;
