//src/modules/deals/deals.schemas.ts

import { z } from "zod";
const dealStages = [
    "prospecting",
    "proposal",
    "negotiation",
    "won",
    "lost",
] as const;

export const createDealSchema = z
    .object({
        title: z.string().trim().min(1),
        valueCents: z.number().int().nonnegative().optional(),
    })
    .strict();

export const changeStageSchema = z
    .object({
        stage: z.enum(dealStages),
    })
    .strict();

export const leadParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
    })
    .strict();

export const dealParamsSchema = z
    .object({
        leadId: z.coerce.number().int().positive(),
        id: z.coerce.number().int().positive(),
    })
    .strict();

export type CreateDealInput = z.infer<typeof createDealSchema>;
