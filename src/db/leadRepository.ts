//src/db/leadRepository.ts
import type {PoolClient} from "pg";
import { withTransaction } from "./withTransaction.js";
import { NotFoundError, ValidationError } from "../errors.js";
import type { Lead, LeadStatus } from "../models/lead.js";
import { pool } from "./pool.js";

type LeadRow = {
    id : number,
    name : string,
    email :string,
    company : string,
    phone : string | null,
    status : LeadStatus
};

function mapLeadRow(row : LeadRow) : Lead {
    return {
        id : row.id,
        name : row.name,
        email :row.email,
        company : row.company,
        ...(row.phone !== null && {phone : row.phone}),
        status : row.status
    };
}

export async function listLeadsByOrg(
    organizationId : number,
    status? : LeadStatus
) : Promise<Lead[]> {
    const result = await pool.query<LeadRow>(
        `SELECT id, name, email, company, phone, status
        FROM leads
        WHERE organization_id = $1
            AND ($2 :: text IS NULL OR status = $2)
        ORDER BY id`,
        [organizationId, status ?? null]
    )
    return result.rows.map(mapLeadRow);
}

export async function findLeadById(
    organizationId: number,
    id: number
): Promise<Lead | undefined> {
    const result = await pool.query<LeadRow>(
        `SELECT id, name, email, company, phone, status
         FROM leads
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, id]
    );

    if (result.rows.length === 0) {
        return undefined;
    }

    return mapLeadRow(result.rows[0]!);
}

type createLeadInput = Pick<
    Lead,
    "name" | "email" | "company"
    > & {
        phone ?: string;
    };

export async function createLead(
    organizationId : number,
    input : createLeadInput
) : Promise<Lead> {
    const result = await pool.query<LeadRow>(
          `INSERT INTO leads (
            organization_id,
            name,
            email,
            company,
            phone
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, company, phone, status`,
        [
            organizationId,
            input.name,
            input.email,
            input.company,
            input.phone ?? null
        ]
    );

    return mapLeadRow(result.rows[0]!);
}

export async function updateLeadStatus(
    organizationId: number,
    id: number,
    status: LeadStatus
) : Promise<Lead | undefined> {
    const result = await pool.query<LeadRow>(
        `UPDATE leads
         SET status = $3
         WHERE id = $1 AND organization_id = $2
         RETURNING id, name, email, company, phone, status`,
        [id, organizationId, status]
    );

    const row = result.rows[0];

    if(!row){
        return undefined;
    }

    return mapLeadRow(row);
}

export async function deleteLead(
    organizationId : number,
    id : number
) : Promise<boolean> {
    const result = await pool.query(
        `DELETE FROM leads
         WHERE id = $1 AND organization_id = $2`,
        [id, organizationId]
    );

    return result.rowCount === 1;
}

export async function assignLeadToUser(
    organizationId : number,
    leadId : number,
    userId : number
) : Promise<Lead> {
    return withTransaction(async(client : PoolClient) => {
        // 1. Confirm that the lead belongs to this organization.
        const leadResult = await client.query(
            `SELECT id
             FROM leads
             WHERE id = $1 AND organization_id = $2
             FOR UPDATE`,
            [leadId, organizationId]
        );
         if (leadResult.rows.length === 0) {
            throw new NotFoundError(
                `Lead with ID ${leadId} not found.`
            );
        }
         // 2. Confirm that the user belongs to the same organization.
        const userResult = await client.query(
            `SELECT id
             FROM users
             WHERE id = $1 AND organization_id = $2`,
            [userId, organizationId]
        );
         if (userResult.rows.length === 0) {
            throw new ValidationError(
                "The assigned user does not belong to this organization."
            );
        }
         // 3. Assign the user and return the updated lead.
        const updateResult = await client.query<LeadRow>(
            `UPDATE leads
             SET assigned_to = $3
             WHERE id = $1 AND organization_id = $2
             RETURNING id, name, email, company, phone, status`,
            [leadId, organizationId, userId]
        );

        return mapLeadRow(updateResult.rows[0]!);
    })
}