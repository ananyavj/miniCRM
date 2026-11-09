import { z } from "zod";

export const registerSchema = z
    .object({
        organizationName: z.string().trim().min(1),
        name: z.string().trim().min(1),
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(8).max(72),
    })
    .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
