import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./token.js";

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
});
