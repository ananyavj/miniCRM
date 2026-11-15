//src/modules/activities/activities.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
    createActivitySchema,
    leadParamsSchema,
} from "./activities.schemas.js";
import { listActivities, logActivity } from "./activities.service.js";

const router = Router({ mergeParams: true });

router.get(
    "/",
    validate(leadParamsSchema, "params"),
    async (_req, res, _next) => {
        const organizationId: number = res.locals.organizationId;
        const { leadId } = res.locals.params;
        const activities = await listActivities(organizationId, leadId);
        res.status(200).json(activities);
    },
);

router.post(
    "/",
    validate(leadParamsSchema, "params"),
    validate(createActivitySchema, "body"),
    async (_req, res) => {
        const organizationId: number = res.locals.organizationId;
        const userId: number = res.locals.userId;
        const { leadId } = res.locals.params;
        const activity = await logActivity(
            organizationId,
            leadId,
            userId,
            res.locals.body,
        );
        res.status(201).json(activity);
    },
);

export default router;
