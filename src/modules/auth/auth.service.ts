import { hashPassword, verifyPassword } from "./password.js";
import {
    findUserById,
    createOrganizationWithOwner,
    findCredentialsByEmail,
} from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import { signAccessToken } from "./token.js";
import { AppError } from "../../errors.js";
import type { User } from "./auth.types.js";

export async function registerOwner(input: RegisterInput) {
    const passwordHash = await hashPassword(input.password);

    return createOrganizationWithOwner({
        organizationName: input.organizationName,
        name: input.name,
        email: input.email,
        passwordHash,
    });
}

export async function login(input: LoginInput) {
    const credentials = await findCredentialsByEmail(input.email);

    if (!credentials || !credentials.passwordHash) {
        throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "Invalid email or password.",
        );
    }

    const passwordMatches = await verifyPassword(
        input.password,
        credentials.passwordHash,
    );

    if (!passwordMatches) {
        throw new AppError(
            401,
            "INVALID_CREDENTIALS",
            "Invalid email or password.",
        );
    }

    const accessToken = signAccessToken({
        userId: credentials.user.id,
        organizationId: credentials.user.organizationId,
        role: credentials.user.role,
    });

    return {
        accessToken,
        user: credentials.user,
    };
}

export async function getAuthenticatedUser(
    userId: number,
    organizationId: number,
): Promise<User> {
    const user = await findUserById(userId);

    if (!user || user.organizationId !== organizationId) {
        throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token.");
    }

    return user;
}
