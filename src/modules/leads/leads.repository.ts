//src/modules/leads/leads.repository.ts
import type { PoolClient } from "pg";
import { withTransaction } from "../../db/withTransaction.js";
import { NotFoundError, ValidationError, ConflictError } from "../../errors.js";
import { isPgConstraintError } from "../../db/pgErrors.js";
import type { Lead, LeadStatus, LeadStatusChange } from "./leads.types.js";
import { pool } from "../../db/pool.js";
import type { ListLeadsQuery } from "./leads.schemas.js";

type LeadRow = {
    id: number;
    name: string;
    email: string;
    company: string;
    phone: string | null;
    status: LeadStatus;
    assigned_to: number | null;
};

function mapLeadRow(row: LeadRow): Lead {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.company,
        ...(row.phone !== null && { phone: row.phone }),
        status: row.status,
        assignedTo: row.assigned_to,
    };
}

const SORT_COLUMNS = {
    id: "id",
    name: "name",
    company: "company",
    createdAt: "created_at",
} as const;

export async function listLeadsByOrg(
    organizationId: number,
    query: ListLeadsQuery,
): Promise<{ items: Lead[]; total: number }> {
    const column = SORT_COLUMNS[query.sort];
    const direction = query.order === "desc" ? "DESC" : "ASC";
    const offset = (query.page - 1) * query.limit;

    // The filters, shared by both queries below.
    const where = `
        WHERE organization_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR name ILIKE $3 OR email ILIKE $3 OR company ILIKE $3)
          AND ($4::int IS NULL OR assigned_to = $4)`;

    const filterValues = [
        organizationId,
        query.status ?? null,
        query.q ? `%${query.q}%` : null,
        query.assignedTo ?? null,
    ];

    const result = await pool.query<LeadRow & { total: number }>(
        `SELECT id, name, email, company, phone, status, assigned_to,
                COUNT(*) OVER()::int AS total
         FROM leads
         ${where}
         ORDER BY ${column} ${direction}, id ASC
         LIMIT $5 OFFSET $6`,
        [...filterValues, query.limit, offset],
    );

    const firstRow = result.rows[0];
    if (firstRow) {
        return { items: result.rows.map(mapLeadRow), total: firstRow.total };
    }

    // Empty page: no rows means no total to read, so count separately.
    const countResult = await pool.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM leads ${where}`,
        filterValues,
    );

    return { items: [], total: countResult.rows[0]!.total };
}

export async function findLeadById(
    organizationId: number,
    id: number,
): Promise<Lead | undefined> {
    const result = await pool.query<LeadRow>(
        `SELECT id, name, email, company, phone, status, assigned_to
         FROM leads
         WHERE organization_id = $1 AND id = $2`,
        [organizationId, id],
    );

    if (result.rows.length === 0) {
        return undefined;
    }

    return mapLeadRow(result.rows[0]!);
}

type createLeadInput = Pick<Lead, "name" | "email" | "company"> & {
    phone?: string;
};

export async function createLead(
    organizationId: number,
    input: createLeadInput,
): Promise<Lead> {
    const result = await pool.query<LeadRow>(
        `INSERT INTO leads (
            organization_id,
            name,
            email,
            company,
            phone
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, company, phone, status, assigned_to`,
        [
            organizationId,
            input.name,
            input.email,
            input.company,
            input.phone ?? null,
        ],
    );

    return mapLeadRow(result.rows[0]!);
}

export async function updateLeadStatus(
    organizationId: number,
    id: number,
    status: LeadStatus,
    changedBy: number,
): Promise<Lead | undefined> {
    return withTransaction(async (client: PoolClient) => {
        // 1. Lock the lead and read its CURRENT status.
        const current = await client.query<{ status: LeadStatus }>(
            `SELECT status
             FROM leads
             WHERE id = $1 AND organization_id = $2
             FOR UPDATE`,
            [id, organizationId],
        );

        const currentRow = current.rows[0];
        if (!currentRow) {
            return undefined;
        }

        // 2. Change the status.
        const updated = await client.query<LeadRow>(
            `UPDATE leads
             SET status = $3
             WHERE id = $1 AND organization_id = $2
             RETURNING id, name, email, company, phone, status, assigned_to`,
            [id, organizationId, status],
        );

        // 3. Record the change, but only if the status really changed.
        if (currentRow.status !== status) {
            await client.query(
                `INSERT INTO lead_status_history
                    (organization_id, lead_id, changed_by, from_status, to_status)
                 VALUES ($1, $2, $3, $4, $5)`,
                [organizationId, id, changedBy, currentRow.status, status],
            );
        }
        return mapLeadRow(updated.rows[0]!);
    });
}

type LeadStatusChangeRow = {
    id: number;
    changed_by: number | null;
    from_status: LeadStatus;
    to_status: LeadStatus;
    changed_at: Date;
};

export async function listLeadStatusHistory(
    organizationId: number,
    leadId: number,
): Promise<LeadStatusChange[]> {
    const result = await pool.query<LeadStatusChangeRow>(
        `SELECT id, changed_by, from_status, to_status, changed_at
         FROM lead_status_history
         WHERE organization_id = $1 AND lead_id = $2
         ORDER BY changed_at, id`,
        [organizationId, leadId],
    );

    return result.rows.map((row) => ({
        id: row.id,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        changedBy: row.changed_by,
        changedAt: row.changed_at.toISOString(),
    }));
}

export async function deleteLead(
    organizationId: number,
    id: number,
): Promise<boolean> {
    try {
        const result = await pool.query(
            `DELETE FROM leads
         WHERE id = $1 AND organization_id = $2`,
            [id, organizationId],
        );

        return result.rowCount === 1;
    } catch (error: unknown) {
        if (isPgConstraintError(error, "23001", "contacts_lead_org_fkey")) {
            throw new ConflictError(
                "LEAD_HAS_CONTACTS",
                "Cannot delete a lead that has contacts.",
            );
        }
        if (isPgConstraintError(error, "23001", "deals_lead_org_fkey")) {
            throw new ConflictError(
                "LEAD_HAS_DEALS",
                "Cannot delete a lead that has deals.",
            );
        }

        throw error;
    }
}

export async function assignLeadToUser(
    organizationId: number,
    leadId: number,
    userId: number,
): Promise<Lead> {
    return withTransaction(async (client: PoolClient) => {
        // 1. Confirm that the lead belongs to this organization.
        const leadResult = await client.query(
            `SELECT id
             FROM leads
             WHERE id = $1 AND organization_id = $2
             FOR UPDATE`,
            [leadId, organizationId],
        );
        if (leadResult.rows.length === 0) {
            throw new NotFoundError(`Lead with ID ${leadId} not found.`);
        }
        // 2. Confirm that the user belongs to the same organization.
        const userResult = await client.query(
            `SELECT id
             FROM users
             WHERE id = $1 AND organization_id = $2`,
            [userId, organizationId],
        );
        if (userResult.rows.length === 0) {
            throw new ValidationError(
                "The assigned user does not belong to this organization.",
            );
        }
        // 3. Assign the user and return the updated lead.
        const updateResult = await client.query<LeadRow>(
            `UPDATE leads
             SET assigned_to = $3
             WHERE id = $1 AND organization_id = $2
             RETURNING id, name, email, company, phone, status, assigned_to`,
            [leadId, organizationId, userId],
        );

        return mapLeadRow(updateResult.rows[0]!);
    });
}
