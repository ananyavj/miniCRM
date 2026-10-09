export type LeadStatus = "new" | "contacted" | "qualified" | "lost";

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company: string;
  status: LeadStatus;
}
