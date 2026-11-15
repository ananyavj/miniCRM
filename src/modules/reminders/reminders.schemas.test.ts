// src/modules/reminders/reminders.schemas.test.ts
// Unit tests for reminder dates: which date strings are accepted and why.
import { describe, expect, it } from "vitest";
import { createReminderSchema } from "./reminders.schemas.js";

describe("createReminderSchema", () => {
    // Proves: any timezone is fine, as long as the time SAYS which timezone it is.
    it.each([
        ["UTC (Z)", "2030-01-15T09:00:00Z"],
        ["an India offset", "2030-01-15T09:00:00+05:30"],
        ["a negative offset", "2030-01-15T09:00:00-08:00"],
    ])("accepts a future time in %s", (_label, dueAt) => {
        expect(
            createReminderSchema.safeParse({ title: "Call", dueAt }).success,
        ).toBe(true);
    });

    // Proves: ambiguous, incomplete, made-up and past times are all rejected.
    it.each([
        ["with no timezone", "2030-01-15T09:00:00"],
        ["that is only a date", "2030-01-15"],
        ["that is not a date", "next friday"],
        ["in the past", "2020-01-01T00:00:00Z"],
    ])("rejects a time %s", (_label, dueAt) => {
        expect(
            createReminderSchema.safeParse({ title: "Call", dueAt }).success,
        ).toBe(false);
    });

    // Proves: the title is trimmed, and a title of only spaces is rejected.
    it("trims the title and rejects a blank one", () => {
        const ok = createReminderSchema.parse({
            title: "  Call Ravi  ",
            dueAt: "2030-01-15T09:00:00Z",
        });
        expect(ok.title).toBe("Call Ravi");

        expect(
            createReminderSchema.safeParse({
                title: "   ",
                dueAt: "2030-01-15T09:00:00Z",
            }).success,
        ).toBe(false);
    });
});
