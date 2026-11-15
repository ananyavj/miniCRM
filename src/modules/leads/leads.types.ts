//src/modules/leads/leads.types.ts
export type LeadStatus = "new" | "contacted" | "qualified" | "lost";

export interface Lead {
    id: number;
    name: string;
    email: string;
    phone?: string;
    company: string;
    status: LeadStatus;
    assignedTo: number | null;
}

export interface LeadStatusChange {
    id: number;
    fromStatus: LeadStatus;
    toStatus: LeadStatus;
    changedBy: number | null;
    changedAt: string;
}
