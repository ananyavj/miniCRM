import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                },
            ],
        },
    },

    {
        files: ["src/modules/**/*.routes.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["**/*.repository.js"],
                            message:
                                "Routes must call services, not repositories directly.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.service.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "express",
                            message: "Services must not depend on Express.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.repository.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "express",
                            message: "Repositories must not depend on Express.",
                        },
                    ],
                    patterns: [
                        {
                            group: ["**/*.routes.js", "**/*.service.js"],
                            message:
                                "Repositories must not depend on routes or services.",
                        },
                    ],
                },
            ],
        },
    },
);
