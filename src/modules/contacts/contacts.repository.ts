//src/modules/contacts/contacts.repository.ts
import type { Contact } from "./contacts.types.js";
import { pool } from "../../db/pool.js";
import type {
    CreateContactInput,
    UpdateContactInput,
} from "./contacts.schemas.js";

export type ContactRow = {
    id: number;
    lead_id: number;
    organization_id: number;
    name: string;
    email: string;
    phone: string | null;
};

export function mapContactRow(row: ContactRow): Contact {
    return {
        id: row.id,
        leadId: row.lead_id,
        name: row.name,
        email: row.email,
        ...(row.phone !== null && { phone: row.phone }),
    };
}

export async function listContactsByLead(
    organizationId: number,
    leadId: number,
): Promise<Contact[]> {
    const result = await pool.query<ContactRow>(
        `
        SELECT id, lead_id, organization_id, name, email, phone
        FROM contacts
        WHERE organization_id = $1
        AND lead_id = $2
        ORDER BY id ASC;`,
        [organizationId, leadId],
    );
    return result.rows.map(mapContactRow);
}

export async function findContactById(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<Contact | undefined> {
    const result = await pool.query<ContactRow>(
        `
            SELECT id, lead_id, organization_id, name, email, phone
            FROM contacts
            WHERE organization_id = $1
            AND lead_id = $2 AND id = $3;`,
        [organizationId, leadId, id],
    );

    const row = result.rows[0];

    if (!row) {
        return undefined;
    }
    return mapContactRow(row);
}

export async function createContact(
    organizationId: number,
    leadId: number,
    input: CreateContactInput,
): Promise<Contact> {
    const result = await pool.query<ContactRow>(
        `
                INSERT INTO contacts (
                    organization_id,
                    lead_id,
                    name,
                    email,
                    phone
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, lead_id, organization_id, name, email, phone;
                `,
        [organizationId, leadId, input.name, input.email, input.phone ?? null],
    );

    return mapContactRow(result.rows[0]!);
}

export async function updateContact(
    organizationId: number,
    leadId: number,
    id: number,
    input: UpdateContactInput,
): Promise<Contact | undefined> {
    const result = await pool.query<ContactRow>(
        `
            UPDATE contacts
            SET
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone)
            WHERE organization_id = $4
            AND lead_id = $5
            AND id = $6
            RETURNING id, lead_id, organization_id, name, email, phone;
        `,
        [
            input.name ?? null,
            input.email ?? null,
            input.phone ?? null,
            organizationId,
            leadId,
            id,
        ],
    );

    const row = result.rows[0];
    if (!row) {
        return undefined;
    }
    return mapContactRow(row);
}

export async function deleteContact(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<boolean> {
    const result = await pool.query(
        `
        DELETE FROM contacts
        WHERE organization_id = $1 AND
        lead_id = $2 AND id = $3
        RETURNING id;`,
        [organizationId, leadId, id],
    );

    return result.rows.length > 0;
}
