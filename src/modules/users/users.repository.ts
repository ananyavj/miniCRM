import { pool } from "../../db/pool.js";
import type { User } from "../auth/auth.types.js";

export async function createUser(
    organizationId: number,
    input: {
        name: string;
        email: string;
        passwordHash: string;
    },
): Promise<User> {
    const result = await pool.query<{
        id: number;
        organization_id: number;
        name: string;
        email: string;
        role: "owner" | "member";
    }>(
        `
      INSERT INTO users (
        organization_id,
        name,
        email,
        password_hash,
        role
      )
      VALUES ($1, $2, $3, $4, 'member')
      RETURNING id, organization_id, name, email, role
    `,
        [organizationId, input.name, input.email, input.passwordHash],
    );

    const row = result.rows[0]!;

    return {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        email: row.email,
        role: row.role,
    };
}

export async function listUsersByOrg(organizationId: number): Promise<User[]> {
    const result = await pool.query<{
        id: number;
        organization_id: number;
        name: string;
        email: string;
        role: "owner" | "member";
    }>(
        `
      SELECT id, organization_id, name, email, role
      FROM users
      WHERE organization_id = $1
      ORDER BY id
    `,
        [organizationId],
    );

    return result.rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        email: row.email,
        role: row.role,
    }));
}
