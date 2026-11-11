import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().min(32),
});

export const config = configSchema.parse(process.env);
