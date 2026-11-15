//src/modules/activities/activities.repository.ts
import { pool } from "../../db/pool.js";
import type { Activity, ActivityType } from "./activities.types.js";
import type { CreateActivityInput } from "./activities.schemas.js";

type ActivityRow = {
    id: number;
    lead_id: number;
    user_id: number | null;
    type: ActivityType;
    note: string | null;
    created_at: Date;
};

function mapActivityRow(row: ActivityRow): Activity {
    return {
        id: row.id,
        leadId: row.lead_id,
        userId: row.user_id,
        type: row.type,
        note: row.note,
        createdAt: row.created_at.toISOString(),
    };
}

export async function createActivity(
    organizationId: number,
    leadId: number,
    userId: number,
    input: CreateActivityInput,
): Promise<Activity> {
    const result = await pool.query<ActivityRow>(
        `
        INSERT INTO activities (organization_id, lead_id, user_id, type, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, lead_id, user_id, type, note, created_at
        `,
        [organizationId, leadId, userId, input.type, input.note ?? null],
    );

    return mapActivityRow(result.rows[0]!);
}

export async function listActivitiesByLead(
    organizationId: number,
    leadId: number,
): Promise<Activity[]> {
    const result = await pool.query<ActivityRow>(
        `SELECT id, lead_id, user_id, type, note, created_at
         FROM activities
         WHERE organization_id = $1 AND lead_id = $2
         ORDER BY created_at DESC, id DESC`,
        [organizationId, leadId],
    );

    return result.rows.map(mapActivityRow);
}
