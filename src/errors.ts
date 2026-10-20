export class AppError extends Error {
    status: number;
    code: string;
    details: unknown[];

    constructor(
        status: number,
        code: string,
        message: string,
        details: unknown[] = [],
    ) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(404, "NOT_FOUND", message);
        this.name = "NotFoundError";
    }
}

export class DuplicateIdError extends AppError {
    constructor(message: string) {
        super(409, "DUPLICATE_ID", message);
        this.name = "DuplicateIdError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, "VALIDATION_ERROR", message);
        this.name = "ValidationError";
    }
}

export class ConflictError extends AppError {
    constructor(code: string, message: string) {
        super(409, code, message);
        this.name = "ConflictError";
    }
}
