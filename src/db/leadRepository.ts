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