//src/config.ts
import "dotenv/config";
import { z } from "zod";

export const configSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
        .string()
        .trim()
        .refine(
            (value) =>
                value.startsWith("postgres://") ||
                value.startsWith("postgresql://"),
            { message: "must start with postgres:// or postgresql://" },
        ),
    JWT_SECRET: z.string().min(32),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
    const problems = parsed.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
    throw new Error(
        `Invalid configuration (check your .env file):\n${problems}`,
    );
}

export const config = parsed.data;
