import {type Lead, type LeadStatus} from "../models/lead.js";
import{
    listLeadsByOrg,
    findLeadById,
    createLead as createLeadInDb,
    updateLeadStatus as updateLeadStatusInDb,
    deleteLead as deleteLeadInDb
} from "../db/leadRepository.js";
import {
  NotFoundError,
  ValidationError,
} from "../errors.js";

export function describeLead(lead: Lead): string {
  let sentence: string = `${lead.name} works at ${lead.company}. Status: ${lead.status}`;
  return sentence;
}

export async function getLeadById(organizationId :  number, id: number): Promise<Lead> {
    
  const leadObj = await findLeadById(organizationId, id);
  if(!leadObj)
  {
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
    input: CreateLeadInput
): Promise<Lead> {
    if (input.name.trim() === "") {
        throw new ValidationError(
            "Name needs to be at least 1 character long."
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
    status: LeadStatus): Promise<Lead> {  
      const lead =  await updateLeadStatusInDb(organizationId, id, status);
      if(!lead)
      {
        throw new NotFoundError(`Lead with ID ${id} not found.`);
      }

      return lead;   
}

export async function deleteLead(
  organizationId : number,
  id : number
): Promise<void> {
    
  const lead = await deleteLeadInDb(organizationId, id);
  if (!lead) {
    throw new NotFoundError(`Lead with ID ${id} couldn't be deleted`);
  }

}

export async function listLeads(organizationId : number,
    status? : LeadStatus): Promise<Lead[]> {
    return listLeadsByOrg(organizationId, status);
}

