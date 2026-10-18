//src/modules/contacts/contacts.service.ts
import { getLeadById } from "../leads/leads.service.js";
import {
    listContactsByLead,
    findContactById,
    createContact as createContactInRepository,
    updateContact as updateContactRepository,
    deleteContact as deleteContactRepository,
} from "./contacts.repository.js";
import { NotFoundError } from "../../errors.js";
import type {
    CreateContactInput,
    UpdateContactInput,
} from "./contacts.schemas.js";
import type { Contact } from "./contacts.types.js";

export async function listContacts(
    organizationId: number,
    leadId: number,
): Promise<Contact[]> {
    await getLeadById(organizationId, leadId);
    return listContactsByLead(organizationId, leadId);
}

export async function createContact(
    organizationId: number,
    leadId: number,
    input: CreateContactInput,
): Promise<Contact> {
    await getLeadById(organizationId, leadId);
    return createContactInRepository(organizationId, leadId, input);
}

export async function getContact(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<Contact> {
    const result = await findContactById(organizationId, leadId, id);
    if (!result) {
        throw new NotFoundError(`Contact with ID ${id} not found.`);
    }
    return result;
}

export async function updateContact(
    organizationId: number,
    leadId: number,
    id: number,
    input: UpdateContactInput,
): Promise<Contact> {
    const result = await updateContactRepository(
        organizationId,
        leadId,
        id,
        input,
    );

    if (!result) {
        throw new NotFoundError(`Contact with ID ${id} not found.`);
    }

    return result;
}

export async function deleteContact(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<boolean> {
    const result = await deleteContactRepository(organizationId, leadId, id);
    if (!result) {
        throw new NotFoundError(`Contact with ID ${id} not found.`);
    }
    return result;
}
