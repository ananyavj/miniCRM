//src/modules/leads/leads.service.ts
import { type Lead, type LeadStatus } from "./leads.types.js";
import {
    listLeadsByOrg,
    findLeadById,
    createLead as createLeadInDb,
    updateLeadStatus as updateLeadStatusInDb,
    deleteLead as deleteLeadInDb,
    assignLeadToUser,
} from "./leads.repository.js";
import { NotFoundError, ValidationError } from "../../errors.js";

export async function getLeadById(
    organizationId: number,
    id: number,
): Promise<Lead> {
    const leadObj = await findLeadById(organizationId, id);
    if (!leadObj) {
        throw new NotFoundError(`Lead with ID ${id} not found.`);
    }
    return leadObj;
}

type CreateLeadInput = {
    name: string;
    email: string;
    company: string;
    phone?: string;
};

export async function createLead(
    organizationId: number,
    input: CreateLeadInput,
): Promise<Lead> {
    if (input.name.trim() === "") {
        throw new ValidationError(
            "Name needs to be at least 1 character long.",
        );
    }

    if (!input.email.includes("@")) {
        throw new ValidationError("Email must contain @.");
    }

    return createLeadInDb(organizationId, input);
}
export async function updateLeadStatus(
    organizationId: number,
    id: number,
    status: LeadStatus,
): Promise<Lead> {
    const lead = await updateLeadStatusInDb(organizationId, id, status);
    if (!lead) {
        throw new NotFoundError(`Lead with ID ${id} not found.`);
    }

    return lead;
}

export async function deleteLead(
    organizationId: number,
    id: number,
): Promise<void> {
    const deleted = await deleteLeadInDb(organizationId, id);

    if (!deleted) {
        throw new NotFoundError(`Lead with ID ${id} couldn't be deleted`);
    }
}

export async function listLeads(
    organizationId: number,
    status?: LeadStatus,
): Promise<Lead[]> {
    return listLeadsByOrg(organizationId, status);
}

export async function assignLead(
    organizationId: number,
    leadId: number,
    userId: number,
): Promise<Lead> {
    return assignLeadToUser(organizationId, leadId, userId);
}
