//src/modules/activities/activities.types.ts
export type ActivityType = "call" | "email" | "meeting" | "note";

export interface Activity {
    id: number;
    leadId: number;
    userId: number | null;
    type: ActivityType;
    note: string | null;
    createdAt: string;
}
