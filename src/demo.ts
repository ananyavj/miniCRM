
import {
    getLeadById,
    createLead,
    updateLeadStatus,
    deleteLead,
    listLeads,
} from "./services/leadService.js";

import {
    NotFoundError,
    ValidationError,
} from "./errors.js";

// TEMP: replaced by token on Day 24
const ORGANIZATION_ID = 1;

async function test(
    name: string,
    action: () => Promise<void>
): Promise<void> {
    try {
        await action();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.log(`FAIL: ${name}`, error);
    }
}

async function main(): Promise<void> {

    await test("Get existing lead", async () => {
        const lead = await getLeadById(ORGANIZATION_ID, 1);
        if (lead.id !== 1) throw new Error("Incorrect lead returned");
    });

    await test("Missing lead throws NotFoundError", async () => {
        try {
            await getLeadById(ORGANIZATION_ID, 999999);
        } catch (error) {
            if (error instanceof NotFoundError) return;
            throw error;
        }
        throw new Error("Expected NotFoundError");
    });

    await test("Empty name is rejected", async () => {
        try {
            await createLead(ORGANIZATION_ID, {
                name: "   ",
                email: "valid@example.com",
                company: "Test Company",
            });
        } catch (error) {
            if (error instanceof ValidationError) return;
            throw error;
        }
        throw new Error("Expected ValidationError");
    });

    await test("Invalid email is rejected", async () => {
        try {
            await createLead(ORGANIZATION_ID, {
                name: "Valid Name",
                email: "invalid-email",
                company: "Test Company",
            });
        } catch (error) {
            if (error instanceof ValidationError) return;
            throw error;
        }
        throw new Error("Expected ValidationError");
    });

    await test("Create a lead with defaults", async () => {
        const lead = await createLead(ORGANIZATION_ID, {
            name: "Maya Sharma",
            email: "maya@example.com",
            company: "Bright Systems",
        });

        if (lead.id <= 0) throw new Error("Invalid ID");
        if (lead.status !== "new") {
            throw new Error("Incorrect default status");
        }
        if ("phone" in lead) {
            throw new Error("Phone should be omitted");
        }
    });

    await test("Update lead status", async () => {
        const lead = await createLead(ORGANIZATION_ID, {
            name: "Update Test",
            email: "update@example.com",
            company: "Test Company",
        });

        await updateLeadStatus(
            ORGANIZATION_ID,
            lead.id,
            "qualified"
        );

        const updatedLead = await getLeadById(
            ORGANIZATION_ID,
            lead.id
        );

        if (updatedLead.status !== "qualified") {
            throw new Error("Status was not updated");
        }
    });

    await test("Delete an existing lead", async () => {
        const lead = await createLead(ORGANIZATION_ID, {
            name: "Delete Test",
            email: "delete@example.com",
            company: "Test Company",
        });

        await deleteLead(ORGANIZATION_ID, lead.id);

        try {
            await getLeadById(ORGANIZATION_ID, lead.id);
        } catch (error) {
            if (error instanceof NotFoundError) return;
            throw error;
        }

        throw new Error("Lead still exists after deletion");
    });

    await test("Deleting missing lead throws NotFoundError", async () => {
        try {
            await deleteLead(ORGANIZATION_ID, 999999);
        } catch (error) {
            if (error instanceof NotFoundError) return;
            throw error;
        }
        throw new Error("Expected NotFoundError");
    });

    await test("listLeads returns a separate array", async () => {
        const originalCount = (
            await listLeads(ORGANIZATION_ID)
        ).length;

        const copiedLeads = await listLeads(ORGANIZATION_ID);
        copiedLeads.pop();

        if (
            (await listLeads(ORGANIZATION_ID)).length !== originalCount
        ) {
            throw new Error("Original results were modified");
        }
    });

    await test("listLeads filters by status", async () => {
        const qualifiedLeads = await listLeads(
            ORGANIZATION_ID,
            "qualified"
        );

        if (
            !qualifiedLeads.every(
                (lead) => lead.status === "qualified"
            )
        ) {
            throw new Error("Incorrect status returned");
        }
    });

    console.log("\nAll test cases finished.");
}

async function compareTimings(): Promise<void> {
    const start1 = Date.now();

    await getLeadById(ORGANIZATION_ID, 1);
    await getLeadById(ORGANIZATION_ID, 2);
    await getLeadById(ORGANIZATION_ID, 3);

    const sequentialTime = Date.now() - start1;

    const start2 = Date.now();

    await Promise.all([
        getLeadById(ORGANIZATION_ID, 1),
        getLeadById(ORGANIZATION_ID, 2),
        getLeadById(ORGANIZATION_ID, 3),
    ]);

    const concurrentTime = Date.now() - start2;

    console.log("Sequential:", sequentialTime, "ms");
    console.log("Concurrent:", concurrentTime, "ms");
}

main()
    .then(() => compareTimings())
    .catch((error) => {
        console.error("Demo failed unexpectedly:", error);
    });
