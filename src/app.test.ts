
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./app.js";
import { pool } from "./db/pool.js";

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
            throw new Error(
                `Refusing to reset database "${databaseName}"`
            );
        }

        await pool.query(
            "TRUNCATE TABLE leads, users, organizations RESTART IDENTITY CASCADE"
        );

        await pool.query(
            `INSERT INTO organizations (name)
             VALUES ('Test Organization Alpha'),
                    ('Test Organization Beta')`
        );
    });

    afterAll(async () => {
        await pool.end();
    });

    
    it("connects to the test database", async () => {
        const result = await pool.query(
            "SELECT current_database() AS database_name"
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
            database: "connected"
        });
    });

    it("rejects requests without an organization header", async () => {
        const response = await request(app).get("/leads");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("INVALID_ORG_ID");
    });

    it.each(["abc", "0", "-1", "1.5"])(
        "rejects invalid organization ID: %s",
        async (organizationId) => {
            const response = await request(app)
                .get("/leads")
                .set("x-org-id", organizationId);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("INVALID_ORG_ID");
        }
    );

    it("returns an empty list for a new organization", async () => {
        const response = await request(app)
            .get("/leads")
            .set(org1);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it("returns 404 for a missing lead", async () => {
        const response = await request(app)
            .get("/leads/999999")
            .set(org1);

        expect(response.status).toBe(404);
    });

    it("creates a lead and returns 201", async () => {
        const response = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "Test Lead",
                email: "testlead@example.com",
                company: "Test Company"
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Test Lead");
        expect(response.body.email).toBe("testlead@example.com");
        expect(response.body.id).toBeDefined();
    });

    it("rejects an invalid email", async () => {
        const response = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "Invalid Lead",
                email: "not-an-email",
                company: "Test Company"
            });

        expect(response.status).toBe(400);
    });

    it("rejects blank names", async () => {
        const response = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "   ",
                email: "blank@example.com",
                company: "Test Company"
            });

        expect(response.status).toBe(400);
    });

    it("rejects unknown fields when creating a lead", async () => {
        const response = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "Test Lead",
                email: "unknown@example.com",
                company: "Test Company",
                unexpectedField: "not allowed"
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it.each(["abc", "1.5", "-1", "0"])(
        "rejects invalid lead ID: %s",
        async (id) => {
            const response = await request(app)
                .get(`/leads/${id}`)
                .set(org1);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe("VALIDATION_ERROR");
        }
    );

    it("rejects an invalid lead status", async () => {
        const response = await request(app)
            .patch("/leads/1")
            .set(org1)
            .send({ status: "pending" });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("updates a lead status", async () => {
        const created = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "Update Test",
                email: "update@example.com",
                company: "Test Company"
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
        const created = await request(app)
            .post("/leads")
            .set(org1)
            .send({
                name: "Delete Test",
                email: "delete@example.com",
                company: "Test Company"
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
                company: "Test Company"
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
        const created = await request(app)
            .post("/leads")
            .set(org2)
            .send({
                name: "Organization Beta Lead",
                email: "beta@example.com",
                company: "Beta Company"
            });

        expect(created.status).toBe(201);

        const response = await request(app)
            .get(`/leads/${created.body.id}`)
            .set(org1);

        expect(response.status).toBe(404);
    });

    it("does not allow one organization to update another organization's lead", async () => {
        const created = await request(app)
            .post("/leads")
            .set(org2)
            .send({
                name: "Organization Beta Lead",
                email: "beta-update@example.com",
                company: "Beta Company"
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
        const created = await request(app)
            .post("/leads")
            .set(org2)
            .send({
                name: "Organization Beta Lead",
                email: "beta-delete@example.com",
                company: "Beta Company"
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
});
