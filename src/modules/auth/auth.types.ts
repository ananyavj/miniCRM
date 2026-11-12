// src/modules/auth/auth.types.ts

export type Role = "owner" | "member";

export type Organization = {
    id: number;
    name: string;
};

export type User = {
    id: number;
    organizationId: number;
    name: string;
    email: string;
    role: "owner" | "member";
};
