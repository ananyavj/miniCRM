import "dotenv/config";
import { z } from "zod";

const databaseSchema = z.object({
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().min(32),
});

export const config = databaseSchema.parse(process.env);
