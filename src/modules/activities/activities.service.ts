//src/modules/activities/activities.service.ts
import { getLeadById } from "../leads/leads.service.js";
import {
    createActivity,
    listActivitiesByLead,
} from "./activities.repository.js";
import type { CreateActivityInput } from "./activities.schemas.js";
import type { Activity } from "./activities.types.js";

export async function logActivity(
    organizationId: number,
    leadId: number,
    userId: number,
    input: CreateActivityInput,
): Promise<Activity> {
    await getLeadById(organizationId, leadId);
    return createActivity(organizationId, leadId, userId, input);
}

export async function listActivities(
    organizationId: number,
    leadId: number,
): Promise<Activity[]> {
    await getLeadById(organizationId, leadId);
    return listActivitiesByLead(organizationId, leadId);
}
