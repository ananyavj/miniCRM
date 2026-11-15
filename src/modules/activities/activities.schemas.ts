//src/modules/activities/activities.schemas.ts
import { z } from "zod";

export const createActivitySchema = z
    .object({
        type: z.enum(["call", "email", "meeting", "note"]),
        note: z.string().trim().min(1).max(2000).optional(),
    })
    .strict();

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const leadParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
    })
    .strict();
