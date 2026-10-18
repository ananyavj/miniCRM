//src/db/pgErrors.ts
export function isPgConstraintError(
    error: unknown,
    code: string,
    constraint: string,
): boolean {
    if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        !("constraint" in error)
    ) {
        return false;
    }

    return error.code === code && error.constraint === constraint;
}
