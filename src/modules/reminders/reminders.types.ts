//src/modules/reminders/reminders.types.ts
export type ReminderStatus = "pending" | "sent" | "done";

export interface Reminder {
    id: number;
    leadId: number;
    userId: number;
    title: string;
    dueAt: string;
    status: ReminderStatus;
    sentAt: string | null;
}
