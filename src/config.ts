import "dotenv/config";
import {z} from "zod";

const databaseSchema = z.object(
    {
        DATABASE_URL : z.string().trim().min(1),
    }
);

export const config = databaseSchema.parse(process.env);