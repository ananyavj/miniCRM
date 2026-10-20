import { describe, expect, it } from "vitest";
import { canTransition } from "./deals.stages.js";
import type { DealStage } from "./deals.types.js";

const cases: [DealStage, DealStage, boolean][] = [
    ["prospecting", "proposal", true],
    ["prospecting", "won", false],
    ["proposal", "negotiation", true],
    ["negotiation", "won", true],
    ["won", "lost", false],
    ["lost", "prospecting", false],
];

describe("canTransition", () => {
    it.each(cases)("%s -> %s should be allowed: %s", (from, to, expected) => {
        expect(canTransition(from, to)).toBe(expected);
    });
});
