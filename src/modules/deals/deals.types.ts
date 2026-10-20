//src/modules/deals/deals.types.ts

export type DealStage =
    "prospecting" | "proposal" | "negotiation" | "won" | "lost";

export interface Deal {
    id: number;
    leadId: number;
    title: string;
    valueCents: number;
    stage: DealStage;
}
