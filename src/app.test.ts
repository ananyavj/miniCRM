
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import {resetLeads} from "./data/leadData.js"

describe("MiniCRM API", () => {
    beforeEach(() => {
        resetLeads();
    });
    it("resets leads to the initial data before each test", async () => {
    const response = await request(app).get("/leads");

    expect(response.body).toHaveLength(5);
    expect(response.body[0].id).toBe(1);
    expect(response.body[0].name).toBe("Sophie Keller");
    });

    it("GET /health returns 200", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });

    it("GET /leads returns the list of leads", async () => {
        const response = await request(app).get("/leads");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it("GET /leads/:id returns 404 for a missing lead", async () => {
        const response = await request(app).get("/leads/999999");

        expect(response.status).toBe(404);
    });

    it("POST /leads creates a lead and returns 201", async () => {
        const response = await request(app)
            .post("/leads")
            .send({
                name: "Test Lead",
                email: "testlead@example.com",
                company: "Test Company"
            });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe("Test Lead");
        expect(response.body.email).toBe("testlead@example.com");
    });

    it("POST /leads rejects an invalid email with 400", async () => {
        const response = await request(app)
            .post("/leads")
            .send({
                name: "Invalid Lead",
                email: "not-an-email",
                company: "Test Company"
            });

        expect(response.status).toBe(400);
    });

    it("DELETE /leads/:id deletes an existing lead and returns 204", async () => {
        const response = await request(app).delete("/leads/1");

        expect(response.status).toBe(204);
    });
});
