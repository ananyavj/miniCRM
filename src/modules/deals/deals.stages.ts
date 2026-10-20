//src/modules/deals/deals.stages.ts
import type { DealStage } from "./deals.types.js";

const stageTransitions: Record<DealStage, DealStage[]> = {
    prospecting: ["proposal", "lost"],
    proposal: ["negotiation", "lost"],
    negotiation: ["won", "lost"],
    won: [],
    lost: [],
};

export function canTransition(from: DealStage, to: DealStage): boolean {
    return stageTransitions[from].includes(to);
}
