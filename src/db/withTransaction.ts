//src/db/withTransaction.ts
import { pool } from "../db/pool.js";
import type { PoolClient } from "pg";

export async function withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect();
    let destroyClient = false;
    try {
        await client.query("BEGIN");

        const result = await callback(client);

        await client.query("COMMIT");

        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Transaction rollback failed:", rollbackError);
            destroyClient = true;
        }
        throw error;
    } finally {
        if (destroyClient) {
            client.release(new Error("Transaction rollback failed"));
        } else {
            client.release();
        }
    }
}
