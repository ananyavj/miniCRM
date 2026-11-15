//src/modules/reminders/reminders.service.ts
import { getLeadById } from "../leads/leads.service.js";
import {
    createReminder,
    listRemindersByLead,
    markReminderDone,
    markDueRemindersSent,
} from "./reminders.repository.js";
import type { CreateReminderInput } from "./reminders.schemas.js";
import type { Reminder } from "./reminders.types.js";
import { NotFoundError } from "../../errors.js";

export async function addReminder(
    organizationId: number,
    leadId: number,
    userId: number,
    input: CreateReminderInput,
): Promise<Reminder> {
    await getLeadById(organizationId, leadId);
    return createReminder(organizationId, leadId, userId, input);
}

export async function listReminders(
    organizationId: number,
    leadId: number,
): Promise<Reminder[]> {
    await getLeadById(organizationId, leadId);
    return listRemindersByLead(organizationId, leadId);
}

export async function completeReminder(
    organizationId: number,
    leadId: number,
    id: number,
): Promise<Reminder> {
    const reminder = await markReminderDone(organizationId, leadId, id);
    if (!reminder) {
        throw new NotFoundError(`Reminder with ID ${id} not found.`);
    }

    return reminder;
}

export async function processDueReminders(
    now: Date = new Date(),
    limit = 50,
): Promise<number> {
    const sent = await markDueRemindersSent(now, limit);

    for (const reminder of sent) {
        // A real app would send an email or a notification here.
        console.log(
            `Reminder ${reminder.id} for user ${reminder.userId}: ${reminder.title}`,
        );
    }

    return sent.length;
}
