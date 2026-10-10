import {type Lead, type LeadStatus} from "../models/lead.js";
import {leads} from "../data/leadData.js";
import {delay} from "../utils.js"

import {
  NotFoundError,
  DuplicateIdError,
  ValidationError,
} from "../errors.js";

export function describeLead(lead: Lead): string {
  let sentence: string = `${lead.name} works at ${lead.company}. Status: ${lead.status}`;
  return sentence;
}

export function findByStatus(leads: Lead[], status: LeadStatus): Lead[] {
  let res: Lead[] = [];
  for (const lead of leads) {
    if (lead.status === status) {
      res.push(lead);
    }
  }
  return res;
}

export async function getLeadById(id: number): Promise<Lead> {
    await delay(50);
  const leadObj = leads.find((lead) => lead.id === id);
  if(leadObj === undefined)
  {
    throw new NotFoundError(`Lead with ID ${id} not found.`);
  }
  return leadObj;
}

export async function addLead(lead: Lead): Promise<void> {
    await delay(50);
  if(leads.some(leadObj => leadObj.id === lead.id))
  {
    throw new DuplicateIdError(`Lead with ID ${lead.id} already exists`);
  }
  leads.push(lead);
}

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<void> {
    await delay(50);
  const lead = await getLeadById(id);
  lead.status = status;
}

export async function deleteLead(id: number): Promise<void> {
    await delay(50);
  const idx: number = leads.findIndex((leadObj) => leadObj.id === id);
  if (idx === -1) {
    throw new NotFoundError(`Lead with ID ${id} doesn't exist`);
  }
  leads.splice(idx, 1);
}

export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
    await delay(50);
  if (status === undefined) {
    const copy = leads.slice();
    return copy;
  } else {
    return leads.filter((leadObj) => leadObj.status === status);
  }
}

type CreateLeadInput = {
    name: string;
    email: string;
    phone?: string;
    company: string;
    status?: LeadStatus;
}

export async function createLead(input: CreateLeadInput) : Promise<Lead> {
    await delay(50);
    if(input.name.trim() === "")
    {
        throw new ValidationError("Name needs to be at least 1 character long.");
    }
    if(!input.email.includes("@"))
    {
        throw new ValidationError("Email must contain @.");
    }
    const ids = leads.map((lead) => lead.id);
    const largestId = ids.length > 0 ? Math.max(...ids) : 0;
    const nextId = largestId + 1;

    const newLead : Lead = {
        id : nextId,
        name : input.name,
        email : input.email,
        company : input.company,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        status : input.status ?? "new"
    }

    leads.push(newLead);
    return newLead;
}