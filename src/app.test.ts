
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./app.js";
import {leads, resetLeads} from "./data/leadData.js"

it("restores a lead's original status after reset", () => {
    resetLeads();

    const firstLead = leads[0];
    expect(firstLead).toBeDefined();

    if (!firstLead) {
        throw new Error("Expected the first lead to exist");
    }

    expect(firstLead.status).toBe("new");

    firstLead.status = "qualified";
    expect(firstLead.status).toBe("qualified");

    resetLeads();

    expect(leads[0]?.status).toBe("new");
});

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


//Invalid ID
it.each(["abc", "1.5", "-1", "0"])(
    "rejects invalid lead ID: %s",
    async (id) => {
        const response = await request(app).get(`/leads/${id}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }
);

//Invalid PATCH status
it("rejects an invalid lead status", async () => {
    const response = await request(app)
        .patch("/leads/1")
        .send({ status: "pending" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
});

//Unknown field in POST body
it("rejects unknown fields when creating a lead", async () => {
    const response = await request(app)
        .post("/leads")
        .send({
            name: "Test Lead",
            email: "test@example.com",
            company: "Test Company",
            unexpectedField: "not allowed"
        });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
});

//malformed json
it("rejects malformed JSON", async () => {
    const response = await request(app)
        .post("/leads")
        .set("Content-Type", "application/json")
        .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
});


//OverSized Req Body
it("rejects an oversized request body", async () => {
    const response = await request(app)
        .post("/leads")
        .send({
            name: "A".repeat(110 * 1024),
            email: "test@example.com",
            company: "Test Company"
        });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("BODY_TOO_LARGE");
});

//Unknown API route
it("returns a consistent error for an unknown route", async () => {
    const response = await request(app).get("/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
});

