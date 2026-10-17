import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
import { withTransaction } from "./withTransaction.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const migrationsDirectory = path.resolve(
    currentDirectory,
    "../../db/migrations",
);

const createMigrationsTable = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
    )
`;

async function main(): Promise<void> {
    try {
        await pool.query(createMigrationsTable);

        const migrationFiles = (await readdir(migrationsDirectory))
            .filter((file) => file.endsWith(".sql"))
            .sort();

        const result = await pool.query<{ version: string }>(
            "SELECT version FROM schema_migrations",
        );

        const appliedMigrations = new Set(result.rows.map((row) => row.version));

        for (const file of migrationFiles) {
            if (appliedMigrations.has(file)) {
                continue;
            }

            const sql = await readFile(
                path.join(migrationsDirectory, file),
                "utf8",
            );

            await withTransaction(async (client) => {
                await client.query(sql);

                await client.query(
                    "INSERT INTO schema_migrations (version) VALUES ($1)",
                    [file],
                );
            });

            console.log(`Applied migration: ${file}`);
        }

        console.log("Migration tracking table is ready.");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
