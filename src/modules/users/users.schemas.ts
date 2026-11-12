import { z } from "zod";

export const createMemberSchema = z
    .object({
        name: z.string().trim().min(1),
        email: z.string().trim().email().toLowerCase(),
        password: z.string().min(8).max(72),
    })
    .strict();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const userIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const changeRoleSchema = z
    .object({
        role: z.enum(["owner", "member"]),
    })
    .strict();
