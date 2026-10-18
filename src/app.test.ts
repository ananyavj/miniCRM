//src/app.test.ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import app, { errorHandler } from "./app.js";
import { pool } from "./db/pool.js";
import { withTransaction } from "./db/withTransaction.js";

const org1 = { "x-org-id": "1" };
const org2 = { "x-org-id": "2" };

describe("MiniCRM API", () => {
    beforeEach(async () => {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error("DATABASE_URL is missing");
        }

        const databaseName = new URL(databaseUrl).pathname.slice(1);

        if (databaseName !== "minicrm_test") {
            throw new Error(`Refusing to reset database "${databaseName}"`);
        }

        await pool.query(
            "TRUNCATE TABLE leads, users, organizations RESTART IDENTITY CASCADE",
        );

        await pool.query(
            `INSERT INTO organizations (name)
             VALUES ('Test Organization Alpha'),
                    ('Test Organization Beta')`,
        );

        await pool.query(
            `INSERT INTO users (organization_id, name, email)
            VALUES
                (1, 'Alice', 'alice@alpha.example.com'),
                (2, 'Bob', 'bob@beta.example.com')`,
        );
    });

    afterAll(async () => {
        await pool.end();
    });

    it("connects to the test database", async () => {
        const result = await pool.query(
            "SELECT current_database() AS database_name",
        );

        expect(result.rows[0].database_name).toBe("minicrm_test");
    });

    it("GET /health returns 200", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });

    it("GET /health/db confirms database connectivity", async () => {
        const response = await request(app).get("/health/db");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "ok",
            database: "connected",
        });
    });

    it("rejects requests without an organization header", async () => {
        const response = await request(app).get("/leads");

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_ORG_ID");
    });

    it.each(["abc", "0", "-1", "1.5"])(
        "rejects invalid organization ID: %s",
        async (organizationId) => {
            const response = await request(app)
                .get("/leads")
                .set("x-org-id", organizationId);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("INVALID_ORG_ID");
        },
    );

    it("returns an empty list for a new organization", async () => {
        const response = await request(app).get("/leads").set(org1);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it("returns 404 for a missing lead", async () => {
        const response = await request(app).get("/leads/999999").set(org1);

        expect(response.status).toBe(404);
    });

    it("creates a lead and returns 201", async () => {
        const response = await request(app).post("/leads").set(org1).send({
            name: "Test Lead",
            email: "testlead@example.com",
            company: "Test Company",
        });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Test Lead");
        expect(response.body.email).toBe("testlead@example.com");
        expect(response.body.id).toBeDefined();
    });

    it("returns 409 when an organization creates a duplicate lead email", async () => {
        const lead = {
            name: "First Lead",
            email: "duplicate@example.com",
            company: "Test Company",
        };

        const firstResponse = await request(app)
            .post("/leads")
            .set(org1)
            .send(lead);

        expect(firstResponse.status).toBe(201);

        const duplicateResponse = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                ...lead,
                name: "Second Lead",
            });

        expect(duplicateResponse.status).toBe(409);
        expect(duplicateResponse.body.error.code).toBe("DUPLICATE_EMAIL");
        expect(duplicateResponse.body.error.message).not.toContain(
            "leads_organization_email_unique",
        );
    });

    it("rejects an invalid email", async () => {
        const response = await request(app).post("/leads").set(org1).send({
            name: "Invalid Lead",
            email: "not-an-email",
            company: "Test Company",
        });

        expect(response.status).toBe(400);
    });

    it("rejects blank names", async () => {
        const response = await request(app).post("/leads").set(org1).send({
            name: "   ",
            email: "blank@example.com",
            company: "Test Company",
        });

        expect(response.status).toBe(400);
    });

    it("rejects unknown fields when creating a lead", async () => {
        const response = await request(app).post("/leads").set(org1).send({
            name: "Test Lead",
            email: "unknown@example.com",
            company: "Test Company",
            unexpectedField: "not allowed",
        });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it.each(["abc", "1.5", "-1", "0"])(
        "rejects invalid lead ID: %s",
        async (id) => {
            const response = await request(app).get(`/leads/${id}`).set(org1);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        },
    );

    it("rejects an invalid lead status", async () => {
        const response = await request(app)
            .patch("/leads/1")
            .set(org1)
            .send({ status: "pending" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
    it("maps a PostgreSQL status constraint violation to 400", async () => {
        await expect(
            pool.query(
                `INSERT INTO leads
                (name, email, company, status, organization_id)
             VALUES ($1, $2, $3, $4, $5)`,
                [
                    "Invalid Status Lead",
                    "invalid-status@example.com",
                    "Test Company",
                    "pending",
                    1,
                ],
            ),
        ).rejects.toMatchObject({
            code: "23514",
            constraint: "leads_status_check",
        });
    });

    it("rejects a lead with a nonexistent organization in PostgreSQL", async () => {
        await expect(
            pool.query(
                `INSERT INTO leads
                (name, email, company, organization_id)
             VALUES ($1, $2, $3, $4)`,
                [
                    "Invalid Organization Lead",
                    "invalid-org@example.com",
                    "Test Company",
                    999999,
                ],
            ),
        ).rejects.toMatchObject({
            code: "23503",
            constraint: "leads_organization_id_fkey",
        });
    });

    it("assigns a lead to a user in the same organization", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Assignment Test",
            email: "assignment@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        const response = await request(app)
            .patch(`/leads/${created.body.id}/assignment`)
            .set(org1)
            .send({ userId: 1 });

        expect(response.status).toBe(200);
        expect(response.body.assignedTo).toBe(1);

        const result = await pool.query(
            "SELECT assigned_to FROM leads WHERE id = $1",
            [created.body.id],
        );

        expect(result.rows[0].assigned_to).toBe(1);
    });

    it("rolls back database changes when a transaction fails", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Rollback Test",
            email: "rollback@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        await expect(
            withTransaction(async (client) => {
                await client.query(
                    "UPDATE leads SET assigned_to = $1 WHERE id = $2",
                    [1, created.body.id],
                );

                // Simulate a failure after the database has changed.
                throw new Error("Simulated transaction failure");
            }),
        ).rejects.toThrow("Simulated transaction failure");

        const result = await pool.query(
            "SELECT assigned_to FROM leads WHERE id = $1",
            [created.body.id],
        );

        expect(result.rows[0].assigned_to).toBeNull();
    });

    it("discards the connection when rollback fails", async () => {
        const rollbackError = new Error("Rollback failed");

        const fakeClient = {
            query: vi.fn(async (sql: string) => {
                if (sql === "ROLLBACK") {
                    throw rollbackError;
                }

                return { rows: [], rowCount: 0 };
            }),
            release: vi.fn(),
        };

        const connectSpy = vi
            .spyOn(pool, "connect")
            .mockResolvedValue(fakeClient as never);

        try {
            await expect(
                withTransaction(async () => {
                    throw new Error("Original operation failed");
                }),
            ).rejects.toThrow("Original operation failed");

            expect(fakeClient.query).toHaveBeenCalledWith("BEGIN");
            expect(fakeClient.query).toHaveBeenCalledWith("ROLLBACK");

            expect(fakeClient.release).toHaveBeenCalledTimes(1);
            expect(fakeClient.release).toHaveBeenCalledWith(expect.any(Error));
        } finally {
            connectSpy.mockRestore();
        }
    });

    it("rejects assigning a lead to a user from another organization", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Cross-Organization Test",
            email: "cross-org@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        const response = await request(app)
            .patch(`/leads/${created.body.id}/assignment`)
            .set(org1)
            .send({ userId: 2 });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");

        const result = await pool.query(
            "SELECT assigned_to FROM leads WHERE id = $1",
            [created.body.id],
        );

        expect(result.rows[0].assigned_to).toBeNull();
    });

    it("rejects assigning a nonexistent user", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Missing User Test",
            email: "missing-user@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        const response = await request(app)
            .patch(`/leads/${created.body.id}/assignment`)
            .set(org1)
            .send({ userId: 999999 });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("updates a lead status", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Update Test",
            email: "update@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        const updated = await request(app)
            .patch(`/leads/${created.body.id}`)
            .set(org1)
            .send({ status: "qualified" });

        expect(updated.status).toBe(200);
        expect(updated.body.status).toBe("qualified");
    });

    it("deletes an existing lead and returns 204", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Delete Test",
            email: "delete@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        const deleted = await request(app)
            .delete(`/leads/${created.body.id}`)
            .set(org1);

        expect(deleted.status).toBe(204);
    });

    it("rejects malformed JSON", async () => {
        const response = await request(app)
            .post("/leads")
            .set(org1)
            .set("Content-Type", "application/json")
            .send('{"name":');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_JSON");
    });

    it("rejects oversized request bodies", async () => {
        const response = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "A".repeat(110 * 1024),
                email: "large@example.com",
                company: "Test Company",
            });

        expect(response.status).toBe(413);
        expect(response.body.error.code).toBe("BODY_TOO_LARGE");
    });

    it("returns a consistent error for an unknown route", async () => {
        const response = await request(app).get("/unknown-route");

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    });

    it("does not allow one organization to read another organization's lead", async () => {
        const created = await request(app).post("/leads").set(org2).send({
            name: "Organization Beta Lead",
            email: "beta@example.com",
            company: "Beta Company",
        });

        expect(created.status).toBe(201);

        const response = await request(app)
            .get(`/leads/${created.body.id}`)
            .set(org1);

        expect(response.status).toBe(404);
    });

    it("does not allow one organization to update another organization's lead", async () => {
        const created = await request(app).post("/leads").set(org2).send({
            name: "Organization Beta Lead",
            email: "beta-update@example.com",
            company: "Beta Company",
        });

        expect(created.status).toBe(201);

        const response = await request(app)
            .patch(`/leads/${created.body.id}`)
            .set(org1)
            .send({ status: "qualified" });

        expect(response.status).toBe(404);

        const stillOwned = await request(app)
            .get(`/leads/${created.body.id}`)
            .set(org2);

        expect(stillOwned.status).toBe(200);
        expect(stillOwned.body.status).toBe("new");
    });

    it("does not allow one organization to delete another organization's lead", async () => {
        const created = await request(app).post("/leads").set(org2).send({
            name: "Organization Beta Lead",
            email: "beta-delete@example.com",
            company: "Beta Company",
        });

        expect(created.status).toBe(201);

        const response = await request(app)
            .delete(`/leads/${created.body.id}`)
            .set(org1);

        expect(response.status).toBe(404);

        const stillExists = await request(app)
            .get(`/leads/${created.body.id}`)
            .set(org2);

        expect(stillExists.status).toBe(200);
    });

    it("enforces same-organization assignment in PostgreSQL", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Database Constraint Test",
            email: "db-constraint@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        await expect(
            pool.query(
                `UPDATE leads
             SET assigned_to = $1
             WHERE id = $2 AND organization_id = $3`,
                [2, created.body.id, 1],
            ),
        ).rejects.toMatchObject({
            code: "23503",
            constraint: "leads_assigned_to_org_fkey",
        });

        const result = await pool.query(
            "SELECT assigned_to FROM leads WHERE id = $1",
            [created.body.id],
        );

        expect(result.rows[0].assigned_to).toBeNull();
    });

    it("prevents a contact from referencing a lead in another organization", async () => {
        const created = await request(app).post("/leads").set(org1).send({
            name: "Contact Isolation Test",
            email: "contact-isolation@example.com",
            company: "Test Company",
        });

        expect(created.status).toBe(201);

        await expect(
            pool.query(
                `INSERT INTO contacts (organization_id, lead_id, name, email)
                 VALUES ($1, $2, $3, $4)`,
                [
                    2,
                    created.body.id,
                    "Cross-Organization Contact",
                    "cross-contact@example.com",
                ],
            ),
        ).rejects.toMatchObject({
            code: "23503",
            constraint: "contacts_lead_org_fkey",
        });
    });

    it("creates a contact for an existing lead and returns 201", async () => {
        const createdLead = await request(app).post("/leads").set(org1).send({
            name: "Contact Test Lead",
            email: "contact-lead@example.com",
            company: "Test Company",
        });

        expect(createdLead.status).toBe(201);

        const response = await request(app)
            .post(`/leads/${createdLead.body.id}/contacts`)
            .set(org1)
            .send({
                name: "Rahul Sharma",
                email: "rahul@example.com",
                phone: "9876543210",
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.leadId).toBe(createdLead.body.id);
        expect(response.body.name).toBe("Rahul Sharma");
        expect(response.body.email).toBe("rahul@example.com");
        expect(response.body.phone).toBe("9876543210");
    });

    it("does not allow a contact to be created for another organization's lead", async () => {
        const createdLead = await request(app).post("/leads").set(org2).send({
            name: "Organization Beta Lead",
            email: "beta-contact-lead@example.com",
            company: "Beta Company",
        });

        expect(createdLead.status).toBe(201);

        const response = await request(app)
            .post(`/leads/${createdLead.body.id}/contacts`)
            .set(org1)
            .send({
                name: "Unauthorized Contact",
                email: "unauthorized-contact@example.com",
            });

        expect(response.status).toBe(404);

        const result = await pool.query(
            `SELECT id FROM contacts
         WHERE email = $1`,
            ["unauthorized-contact@example.com"],
        );

        expect(result.rows).toHaveLength(0);
    });

    it("prevents deleting a lead that has contacts and preserves the lead", async () => {
        const createdLead = await request(app).post("/leads").set(org1).send({
            name: "Lead With Contact",
            email: "lead-with-contact@example.com",
            company: "Test Company",
        });

        expect(createdLead.status).toBe(201);

        const createdContact = await request(app)
            .post(`/leads/${createdLead.body.id}/contacts`)
            .set(org1)
            .send({
                name: "Existing Contact",
                email: "existing-contact@example.com",
            });

        expect(createdContact.status).toBe(201);

        const deleteResponse = await request(app)
            .delete(`/leads/${createdLead.body.id}`)
            .set(org1);

        expect(deleteResponse.status).toBe(409);
        expect(deleteResponse.body.error.code).toBe("LEAD_HAS_CONTACTS");

        const leadResponse = await request(app)
            .get(`/leads/${createdLead.body.id}`)
            .set(org1);

        expect(leadResponse.status).toBe(200);
        expect(leadResponse.body.id).toBe(createdLead.body.id);
    });
    // Sends a given error through the real errorHandler, with no database involved.
    async function responseForError(error: unknown) {
        const testApp = express();
        testApp.get("/boom", (req, res, next) => {
            next(error);
        });
        testApp.use(errorHandler);
        return request(testApp).get("/boom");
    }

    it.each([
        ["23505", "leads_organization_email_unique", 409, "DUPLICATE_EMAIL"],
        ["23505", "contacts_lead_email_unique", 409, "DUPLICATE_CONTACT_EMAIL"],
        ["23514", "leads_status_check", 400, "INVALID_LEAD_STATUS"],
        ["23514", "leads_name_not_blank", 400, "VALIDATION_ERROR"],
        ["23514", "leads_company_not_blank", 400, "VALIDATION_ERROR"],
        ["23514", "leads_email_check", 400, "VALIDATION_ERROR"],
        ["23503", "leads_assigned_to_org_fkey", 400, "INVALID_ASSIGNEE"],
        ["23503", "leads_organization_id_fkey", 400, "INVALID_REFERENCE"],
        ["23502", "leads_name_key", 400, "REQUIRED_FIELD_MISSING"],
    ])(
        "errorHandler maps PostgreSQL %s (%s) to %i %s",
        async (code, constraint, status, errorCode) => {
            const response = await responseForError({ code, constraint });

            expect(response.status).toBe(status);
            expect(response.body.error.code).toBe(errorCode);
            expect(response.body.error.message).not.toContain(constraint);
        },
    );

    it("errorHandler returns a generic 500 for an unknown error", async () => {
        const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const response = await responseForError(
                new Error("secret internal detail"),
            );

            expect(response.status).toBe(500);
            expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
            expect(JSON.stringify(response.body)).not.toContain(
                "secret internal detail",
            );
            expect(consoleSpy).toHaveBeenCalled();
        } finally {
            consoleSpy.mockRestore();
        }
    });
});
