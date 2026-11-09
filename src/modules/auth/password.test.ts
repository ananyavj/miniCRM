import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password helpers", () => {
    it("hashes and verifies passwords", async () => {
        const password = "correct-horse-battery";

        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        expect(hash1).not.toBe(hash2);
        expect(await verifyPassword(password, hash1)).toBe(true);
        expect(await verifyPassword("wrong-password", hash1)).toBe(false);
    });
});
