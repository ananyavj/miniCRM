//src/modules/reminders/reminders.schemas.ts
import { z } from "zod";

export const createReminderSchema = z
    .object({
        title: z.string().trim().min(1).max(200),
        dueAt: z.iso
            .datetime({ offset: true })
            .refine((value) => new Date(value).getTime() > Date.now(), {
                message: "dueAt must be in the future",
            }),
    })
    .strict();

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const leadParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
    })
    .strict();

export const reminderParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
        id: z.coerce.number().int().positive(),
    })
    .strict();
