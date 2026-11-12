import { pool } from "../../db/pool.js";
import { withTransaction } from "../../db/withTransaction.js";
import type { Role, User } from "../auth/auth.types.js";
import { ConflictError, NotFoundError } from "../../errors.js";

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

export async function changeUserRole(
    organizationId: number,
    userId: number,
    role: Role,
): Promise<User> {
    return withTransaction(async (client) => {
        const userResult = await client.query<{
            id: number;
            role: Role;
        }>(
            `
            SELECT id, role
            FROM users
            WHERE id = $1
              AND organization_id = $2
            FOR UPDATE
            `,
            [userId, organizationId],
        );

        const currentUser = userResult.rows[0];

        if (!currentUser) {
            throw new NotFoundError("User not found.");
        }

        if (currentUser.role === "owner" && role === "member") {
            const ownersResult = await client.query(
                `
                SELECT id
                FROM users
                WHERE organization_id = $1
                  AND role = 'owner'
                FOR UPDATE
                `,
                [organizationId],
            );

            if (ownersResult.rowCount === 1) {
                throw new ConflictError(
                    "LAST_OWNER",
                    "An organization must keep at least one owner.",
                );
            }
        }

        const result = await client.query<{
            id: number;
            organization_id: number;
            name: string;
            email: string;
            role: Role;
        }>(
            `
            UPDATE users
            SET role = $3
            WHERE id = $1
              AND organization_id = $2
            RETURNING
                id,
                organization_id,
                name,
                email,
                role
            `,
            [userId, organizationId, role],
        );

        const updatedUser = result.rows[0];

        if (!updatedUser) {
            throw new NotFoundError("User not found.");
        }

        // Map the database row (organization_id) to the API shape (organizationId).
        return {
            id: updatedUser.id,
            organizationId: updatedUser.organization_id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
        };
    });
}
