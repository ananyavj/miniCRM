//src/modules/contacts/contacts.schemas.ts
import { z } from "zod";

export const createContactSchema = z
    .object({
        name: z.string().trim().min(1),
        email: z.email(),
        phone: z.string().optional(),
    })
    .strict();

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z
    .object({
        name: z.string().trim().min(1),
        email: z.email(),
        phone: z.string().optional(),
    })
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided",
    });

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const leadParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
    })
    .strict();

export const contactParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
        id: z.coerce.number().int().positive(),
    })
    .strict();
