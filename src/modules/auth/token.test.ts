import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { signAccessToken, verifyAccessToken } from "./token.js";
import { config } from "../../config.js";

describe("access tokens", () => {
    it("signs and verifies an access token", () => {
        const token = signAccessToken({
            userId: 7,
            organizationId: 3,
            role: "owner",
        });

        const result = verifyAccessToken(token);

        expect(result).toEqual({
            userId: 7,
            organizationId: 3,
            role: "owner",
        });

        const parts = token.split(".");
        const modifiedToken = `${parts[0]}.${parts[1]}x.${parts[2]}`;

        expect(() => verifyAccessToken(modifiedToken)).toThrow();
    });

    // Proves: a token whose time is up is refused, even with a valid signature.
    it("rejects an expired token", () => {
        const token = jwt.sign({ org: 3, role: "owner" }, config.JWT_SECRET, {
            subject: "7",
            algorithm: "HS256",
            expiresIn: -10,
        });

        expect(() => verifyAccessToken(token)).toThrow();
    });

    // Proves: a token made with someone else's secret is refused.
    it("rejects a token signed with a different secret", () => {
        const token = jwt.sign(
            { org: 3, role: "owner" },
            "a-completely-different-secret-that-is-long-enough",
            { subject: "7", algorithm: "HS256", expiresIn: "1h" },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });

    // Proves: even a correctly signed token is refused if its contents have the
    // wrong shape (no org, unknown role). This is the Zod check in verifyAccessToken.
    it("rejects a correctly signed token with the wrong contents", () => {
        const token = jwt.sign({ role: "admin" }, config.JWT_SECRET, {
            subject: "7",
            algorithm: "HS256",
            expiresIn: "1h",
        });

        expect(() => verifyAccessToken(token)).toThrow();
    });
});
