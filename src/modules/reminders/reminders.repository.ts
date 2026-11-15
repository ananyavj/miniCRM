//src/modules/reminders/reminders.repository.ts
import { pool } from "../../db/pool.js";
import type { Reminder, ReminderStatus } from "./reminders.types.js";
import type { CreateReminderInput } from "./reminders.schemas.js";

type ReminderRow = {
    id: number;
    lead_id: number;
    user_id: number;
    title: string;
    due_at: Date;
    status: ReminderStatus;
    sent_at: Date | null;
};

function mapReminderRow(row: ReminderRow): Reminder {
    return {
        id: row.id,
        leadId: row.lead_id,
        userId: row.user_id,
        title: row.title,
        dueAt: row.due_at.toISOString(),
        status: row.status,
        sentAt: row.sent_at ? row.sent_at.toISOString() : null,
    };
}

export async function createReminder(
    organizationId: number,
    leadId: number,
    userId: number,
    input: CreateReminderInput,
): Promise<Reminder> {
    const result = await pool.query<ReminderRow>(
        `INSERT INTO reminders (organization_id, lead_id, user_id, title, due_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, lead_id, user_id, title, due_at, status, sent_at`,
        [organizationId, leadId, userId, input.title, input.dueAt],
    );

    return mapReminderRow(result.rows[0]!);
}

export async function listRemindersByLead(
    organizationId: number,
    leadId: number,
): Promise<Reminder[]> {
    const result = await pool.query<ReminderRow>(
        `SELECT id, lead_id, user_id, title, due_at, status, sent_at
         FROM reminders
         WHERE organization_id = $1 AND lead_id = $2
         ORDER BY due_at, id`,
        [organizationId, leadId],
    );

    return result.rows.map(mapReminderRow);
}

export async function markReminderDone(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<Reminder | undefined> {
    const result = await pool.query<ReminderRow>(
        `UPDATE reminders
         SET status = 'done'
         WHERE id = $1 AND lead_id = $2 AND organization_id = $3
         RETURNING id, lead_id, user_id, title, due_at, status, sent_at`,
        [id, leadId, organizationId],
    );

    const row = result.rows[0];
    return row ? mapReminderRow(row) : undefined;
}
