import { withTransaction } from "../../db/withTransaction.js";
import { pool } from "../../db/pool.js";
import type { RegisterInput } from "./auth.schemas.js";
import type { Organization, User } from "./auth.types.js";

// Everything from the register form EXCEPT the plain password, plus the hash.
// The repository can never receive the plain password: TypeScript will refuse.
type RegistrationData = Omit<RegisterInput, "password"> & {
    passwordHash: string;
};

export async function createOrganizationWithOwner(
    input: RegistrationData,
): Promise<{
    organization: Organization;
    user: User;
}> {
    return withTransaction(async (client) => {
        const organizationResult = await client.query<{
            id: number;
            name: string;
        }>(
            `INSERT INTO organizations (name)
             VALUES ($1)
             RETURNING id, name`,
            [input.organizationName],
        );

        const organizationRow = organizationResult.rows[0]!;

        const userResult = await client.query<{
            id: number;
            organization_id: number;
            name: string;
            email: string;
            role: "owner" | "member";
        }>(
            `INSERT INTO users (
                organization_id,
                name,
                email,
                password_hash,
                role
             )
             VALUES ($1, $2, $3, $4, 'owner')
             RETURNING id, organization_id, name, email, role`,
            [organizationRow.id, input.name, input.email, input.passwordHash],
        );

        const userRow = userResult.rows[0]!;

        return {
            organization: {
                id: organizationRow.id,
                name: organizationRow.name,
            },
            user: {
                id: userRow.id,
                organizationId: userRow.organization_id,
                name: userRow.name,
                email: userRow.email,
                role: userRow.role,
            },
        };
    });
}

export async function findCredentialsByEmail(email: string) {
    const result = await pool.query<{
        id: number;
        organization_id: number;
        name: string;
        email: string;
        role: "owner" | "member";
        password_hash: string | null;
    }>(
        `
        SELECT
            id,
            organization_id,
            name,
            email,
            role,
            password_hash
        FROM users
        WHERE email = $1
        `,
        [email],
    );

    const row = result.rows[0];

    if (!row) {
        return undefined;
    }

    return {
        user: {
            id: row.id,
            organizationId: row.organization_id,
            name: row.name,
            email: row.email,
            role: row.role,
        },
        passwordHash: row.password_hash,
    };
}
