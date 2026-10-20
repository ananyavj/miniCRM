//src/modules/deals/deals.repository.ts

import type { Deal } from "./deals.types.js";
import type { CreateDealInput } from "./deals.schemas.js";
import { pool } from "../../db/pool.js";

export type DealRow = {
    id: number;
    lead_id: number;
    organization_id: number;
    title: string;
    value_cents: number;
    stage: Deal["stage"];
};

export function mapDealRow(row: DealRow): Deal {
    return {
        id: row.id,
        leadId: row.lead_id,
        title: row.title,
        valueCents: row.value_cents,
        stage: row.stage,
    };
}

export async function listDealsByLead(
    organizationId: number,
    leadId: number,
): Promise<Deal[]> {
    const result = await pool.query<DealRow>(
        `
        SELECT id, lead_id, organization_id, title, value_cents, stage
        FROM deals
        WHERE organization_id = $1
        AND lead_id = $2
        ORDER BY id ASC;
        `,
        [organizationId, leadId],
    );

    return result.rows.map(mapDealRow);
}

export async function createDeal(
    organizationId: number,
    leadId: number,
    input: CreateDealInput,
): Promise<Deal> {
    const result = await pool.query<DealRow>(
        `
        INSERT INTO deals (
            organization_id,
            lead_id,
            title,
            value_cents
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id, lead_id, organization_id, title, value_cents, stage;
        `,
        [organizationId, leadId, input.title, input.valueCents ?? 0],
    );

    return mapDealRow(result.rows[0]!);
}

export async function findDealById(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<Deal | undefined> {
    const result = await pool.query<DealRow>(
        `
        SELECT id, lead_id, organization_id, title, value_cents, stage
        FROM deals
        WHERE organization_id = $1
        AND lead_id = $2
        AND id = $3;
        `,
        [organizationId, leadId, id],
    );

    const row = result.rows[0];
    if (!row) {
        return undefined;
    }
    return mapDealRow(row);
}

export async function deleteDeal(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<boolean> {
    const result = await pool.query(
        `
        DELETE FROM deals
        WHERE organization_id = $1
        AND lead_id = $2
        AND id = $3
        RETURNING id;
        `,
        [organizationId, leadId, id],
    );

    return result.rows.length > 0;
}

export async function changeDealStage(
    organizationId: number,
    leadId: number,
    id: number,
    fromStage: Deal["stage"],
    toStage: Deal["stage"],
): Promise<Deal | undefined> {
    const result = await pool.query<DealRow>(
        `
        UPDATE deals
        SET stage = $1
        WHERE organization_id = $2
        AND lead_id = $3
        AND id = $4
        AND stage = $5
        RETURNING id, lead_id, organization_id, title, value_cents, stage;
        `,
        [toStage, organizationId, leadId, id, fromStage],
    );

    const row = result.rows[0];

    if (!row) {
        return undefined;
    }
    return mapDealRow(row);
}
