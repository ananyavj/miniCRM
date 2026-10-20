//src/modules/deals/deals.service.ts
import { getLeadById } from "../leads/leads.service.js";
import {
    listDealsByLead,
    createDeal as createDealInRepository,
    findDealById,
    deleteDeal as deleteDealInRepository,
    changeDealStage as changeDealStageInRepository,
} from "./deals.repository.js";
import { NotFoundError, ConflictError } from "../../errors.js";
import { canTransition } from "./deals.stages.js";
import type { CreateDealInput } from "./deals.schemas.js";
import type { Deal, DealStage } from "./deals.types.js";

export async function listDeals(
    organizationId: number,
    leadId: number,
): Promise<Deal[]> {
    await getLeadById(organizationId, leadId);
    return listDealsByLead(organizationId, leadId);
}

export async function createDeal(
    organizationId: number,
    leadId: number,
    input: CreateDealInput,
): Promise<Deal> {
    await getLeadById(organizationId, leadId);
    return createDealInRepository(organizationId, leadId, input);
}

export async function deleteDeal(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<boolean> {
    const result = await deleteDealInRepository(organizationId, leadId, id);

    if (!result) {
        throw new NotFoundError(`Deal with ID ${id} not found.`);
    }

    return result;
}

export async function changeStage(
    organizationId: number,
    leadId: number,
    id: number,
    newStage: DealStage,
): Promise<Deal> {
    const deal = await findDealById(organizationId, leadId, id);

    if (!deal) {
        throw new NotFoundError(`Deal with ID ${id} not found.`);
    }

    if (!canTransition(deal.stage, newStage)) {
        throw new ConflictError(
            "INVALID_STAGE_TRANSITION",
            `Cannot move a deal from ${deal.stage} to ${newStage}.`,
        );
    }

    const updatedDeal = await changeDealStageInRepository(
        organizationId,
        leadId,
        id,
        deal.stage,
        newStage,
    );

    if (!updatedDeal) {
        throw new ConflictError(
            "DEAL_CHANGED",
            "The deal was changed by someone else. Reload and try again.",
        );
    }

    return updatedDeal;
}
