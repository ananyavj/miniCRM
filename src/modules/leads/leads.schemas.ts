//src/modules/leads/leads.schemas.ts
import { z } from "zod";
const leadStatuses = ["new", "contacted", "qualified", "lost"] as const;
export const leadStatusSchema = z.enum(leadStatuses);

export const createLeadSchema = z
    .object({
        name: z.string().trim().min(1),
        email: z.email(),
        phone: z.string().optional(),
        company: z.string().trim().min(1),
    })
    .strict();

export const updateLeadStatusSchema = z
    .object({
        status: leadStatusSchema,
    })
    .strict();

export const leadIdSchema = z
    .object({
        id: z.coerce.number().int().positive(),
    })
    .strict();

export const listLeadsQuerySchema = z
    .object({
        status: leadStatusSchema.optional(),
    })
    .strict();

export const assignLeadSchema = z
    .object({
        userId: z.number().int().positive(),
    })
    .strict();
