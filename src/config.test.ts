// src/config.test.ts
// Unit tests for the settings check: which .env values are accepted at startup.
import { describe, expect, it } from "vitest";
import { configSchema } from "./config.js";

const validSettings = {
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/minicrm",
    JWT_SECRET: "a".repeat(32),
};

describe("configSchema", () => {
    // Proves: with only the two required settings, the defaults fill in the rest.
    it("fills in NODE_ENV and PORT defaults", () => {
        const config = configSchema.parse(validSettings);

        expect(config.NODE_ENV).toBe("development");
        expect(config.PORT).toBe(3000);
    });

    // Proves: settings arrive as text, and PORT is turned into a number.
    it("reads PORT and NODE_ENV when they are set", () => {
        const config = configSchema.parse({
            ...validSettings,
            PORT: "8080",
            NODE_ENV: "production",
        });

        expect(config.PORT).toBe(8080);
        expect(config.NODE_ENV).toBe("production");
    });

    // Proves: both ways of writing a Postgres address are accepted.
    it("accepts postgres:// as well as postgresql://", () => {
        expect(
            configSchema.safeParse({
                ...validSettings,
                DATABASE_URL: "postgres://user:pw@db.example.com:5432/minicrm",
            }).success,
        ).toBe(true);
    });

    // Proves: every kind of bad setting stops the app from starting.
    it.each([
        ["a PORT that isn't a number", { PORT: "abc" }],
        ["a PORT that is too big", { PORT: "70000" }],
        ["a PORT of zero", { PORT: "0" }],
        ["an unknown NODE_ENV", { NODE_ENV: "staging" }],
        [
            "a non-Postgres DATABASE_URL",
            { DATABASE_URL: "mysql://localhost/db" },
        ],
        ["an empty DATABASE_URL", { DATABASE_URL: "" }],
        [
            "a JWT_SECRET shorter than 32 characters",
            { JWT_SECRET: "too-short" },
        ],
    ])("rejects %s", (_label, override) => {
        expect(
            configSchema.safeParse({ ...validSettings, ...override }).success,
        ).toBe(false);
    });

    // Proves: a missing required setting is caught too.
    it.each(["DATABASE_URL", "JWT_SECRET"])("rejects a missing %s", (key) => {
        const settings: Record<string, string> = { ...validSettings };
        delete settings[key];

        expect(configSchema.safeParse(settings).success).toBe(false);
    });
});
