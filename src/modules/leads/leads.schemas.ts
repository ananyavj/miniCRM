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
        q: z.string().trim().min(1).max(100).optional(),
        assignedTo: z.coerce.number().int().positive().optional(),
        sort: z.enum(["id", "name", "company", "createdAt"]).default("id"),
        order: z.enum(["asc", "desc"]).default("asc"),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        page: z.coerce.number().int().min(1).default(1),
    })
    .strict();

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export const assignLeadSchema = z
    .object({
        userId: z.number().int().positive(),
    })
    .strict();
