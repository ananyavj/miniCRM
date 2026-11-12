import { hashPassword } from "../auth/password.js";
import {
    changeUserRole,
    createUser,
    listUsersByOrg,
} from "./users.repository.js";
import type { CreateMemberInput } from "./users.schemas.js";
import type { Role } from "../auth/auth.types.js";

export async function createMember(
    organizationId: number,
    input: CreateMemberInput,
) {
    const passwordHash = await hashPassword(input.password);

    return createUser(organizationId, {
        name: input.name,
        email: input.email,
        passwordHash,
    });
}

export async function listMembers(organizationId: number) {
    return listUsersByOrg(organizationId);
}

export async function changeRole(
    organizationId: number,
    userId: number,
    role: Role,
) {
    return changeUserRole(organizationId, userId, role);
}
