import { hashPassword } from "./password.js";
import { createOrganizationWithOwner } from "./auth.repository.js";
import type { RegisterInput } from "./auth.schemas.js";

export async function registerOwner(input: RegisterInput) {
    const passwordHash = await hashPassword(input.password);

    return createOrganizationWithOwner({
        organizationName: input.organizationName,
        name: input.name,
        email: input.email,
        passwordHash,
    });
}
