import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../../config.js";

const JWT_ALGORITHM = "HS256" as const;
const JWT_EXPIRES_IN = "1h" as const;

const acessTokenPayloadSchema = z.object({
    sub: z.string(),
    org: z.number().int().positive(),
    role: z.enum(["owner", "member"]),
});

type SignAccessTokenInput = {
    userId: number;
    organizationId: number;
    role: "owner" | "member";
};

export function signAccessToken({
    userId,
    organizationId,
    role,
}: SignAccessTokenInput): string {
    return jwt.sign(
        {
            org: organizationId,
            role,
        },
        config.JWT_SECRET,
        {
            subject: String(userId),
            algorithm: JWT_ALGORITHM,
            expiresIn: JWT_EXPIRES_IN,
        },
    );
}

export function verifyAccessToken(token: string): {
    userId: number;
    organizationId: number;
    role: "owner" | "member";
} {
    const payload = jwt.verify(token, config.JWT_SECRET, {
        algorithms: [JWT_ALGORITHM],
    });

    const parsed = acessTokenPayloadSchema.parse(payload);

    return {
        userId: Number(parsed.sub),
        organizationId: parsed.org,
        role: parsed.role,
    };
}
