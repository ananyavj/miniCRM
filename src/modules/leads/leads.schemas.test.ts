// src/modules/leads/leads.schemas.test.ts
// Unit tests for the GET /leads query schema: no HTTP, no database.
import { describe, expect, it } from "vitest";
import { listLeadsQuerySchema } from "./leads.schemas.js";

describe("listLeadsQuerySchema", () => {
    // Proves: with an empty query string, Zod fills in every default.
    it("fills in defaults when nothing is sent", () => {
        expect(listLeadsQuerySchema.parse({})).toEqual({
            sort: "id",
            order: "asc",
            limit: 20,
            page: 1,
        });
    });

    // Proves: query strings arrive as text, and z.coerce turns them into numbers.
    it("turns query-string text into numbers", () => {
        const result = listLeadsQuerySchema.parse({
            assignedTo: "3",
            limit: "10",
            page: "2",
        });

        expect(result.assignedTo).toBe(3);
        expect(result.limit).toBe(10);
        expect(result.page).toBe(2);
    });

    // Proves: impossible pages, non-numbers, non-whitelisted sort columns
    // and blank searches are all rejected.
    it.each([
        ["page", "0"],
        ["limit", "0"],
        ["limit", "abc"],
        ["sort", "email"],
        ["q", "   "],
    ])("rejects %s=%s", (key, value) => {
        expect(listLeadsQuerySchema.safeParse({ [key]: value }).success).toBe(
            false,
        );
    });
});
