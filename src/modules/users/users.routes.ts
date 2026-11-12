import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { changeRole, createMember, listMembers } from "./users.service.js";
import {
    createMemberSchema,
    changeRoleSchema,
    userIdParamsSchema,
} from "./users.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
    const users = await listMembers(res.locals.organizationId);

    res.status(200).json(users);
});

router.post(
    "/",
    requireRole("owner"),
    validate(createMemberSchema, "body"),
    async (req, res) => {
        const user = await createMember(
            res.locals.organizationId,
            res.locals.body,
        );

        res.status(201).json(user);
    },
);

router.patch(
    "/:id/role",
    requireRole("owner"),
    validate(userIdParamsSchema, "params"),
    validate(changeRoleSchema, "body"),
    async (req, res) => {
        const user = await changeRole(
            res.locals.organizationId,
            res.locals.params.id,
            res.locals.body.role,
        );

        res.status(200).json(user);
    },
);
export default router;
