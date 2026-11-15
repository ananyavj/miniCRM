//src/modules/reminders/reminders.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
    createReminderSchema,
    leadParamsSchema,
    reminderParamsSchema,
} from "./reminders.schemas.js";
import {
    addReminder,
    completeReminder,
    listReminders,
} from "./reminders.service.js";

const router = Router({ mergeParams: true });

router.get("/", validate(leadParamsSchema, "params"), async (_req, res) => {
    const organizationId: number = res.locals.organizationId;
    const { leadId } = res.locals.params;
    const reminders = await listReminders(organizationId, leadId);
    res.status(200).json(reminders);
});

router.post(
    "/",
    validate(leadParamsSchema, "params"),
    validate(createReminderSchema, "body"),
    async (_req, res) => {
        const organizationId: number = res.locals.organizationId;
        const userId: number = res.locals.userId;
        const { leadId } = res.locals.params;
        const reminder = await addReminder(
            organizationId,
            leadId,
            userId,
            res.locals.body,
        );
        res.status(201).json(reminder);
    },
);

router.patch(
    "/:id/done",
    validate(reminderParamsSchema, "params"),
    async (_req, res) => {
        const organizationId: number = res.locals.organizationId;
        const { leadId, id } = res.locals.params;
        const reminder = await completeReminder(organizationId, leadId, id);
        res.status(200).json(reminder);
    },
);

export default router;
