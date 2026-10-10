
import {
    getLeadById,
    addLead,
    updateLeadStatus,
    deleteLead,
    listLeads,
    createLead
} from "./services/leadService.js";

import {
    NotFoundError,
    DuplicateIdError,
    ValidationError,
} from "./errors.js";

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

    // 1. Retrieve an existing lead
    await test("Get existing lead", async () => {
        const lead = await getLeadById(1);
        if (lead.id !== 1) throw new Error("Incorrect lead returned");
    });

    // 2. Missing lead throws NotFoundError
    await test("Missing lead throws NotFoundError", async () => {
        try {
            await getLeadById(999);
        } catch (error) {
            if (error instanceof NotFoundError) return;
            throw error;
        }
        throw new Error("Expected NotFoundError");
    });

    // 3. Duplicate ID throws DuplicateIdError
    await test("Duplicate ID is rejected", async () => {
        try {
            await addLead({
                id: 1,
                name: "Duplicate",
                email: "duplicate@example.com",
                company: "Test Company",
                status: "new",
            });
        } catch (error) {
            if (error instanceof DuplicateIdError) return;
            throw error;
        }
        throw new Error("Expected DuplicateIdError");
    });

    // 4. Invalid name is rejected
    await test("Empty name is rejected", async () => {
        try {
            await createLead({
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

    // 5. Invalid email is rejected
    await test("Invalid email is rejected", async () => {
        try {
            await createLead({
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

    // 6. Successful creation
    await test("Create a lead with defaults", async () => {
        const lead = await createLead({
            name: "Maya Sharma",
            email: "maya@example.com",
            company: "Bright Systems",
        });

        if (lead.id <= 0) throw new Error("Invalid ID");
        if (lead.status !== "new") throw new Error("Incorrect default status");
        if ("phone" in lead) throw new Error("Phone should be omitted");
    });

    // 7. Updating a lead
    await test("Update lead status", async () => {
        const lead = await createLead({
            name: "Update Test",
            email: "update@example.com",
            company: "Test Company",
        });

        await updateLeadStatus(lead.id, "qualified");

        const updatedLead = await getLeadById(lead.id);
        if (updatedLead.status !== "qualified") {
            throw new Error("Status was not updated");
        }
    });

    // 8. Deleting an existing lead
    await test("Delete an existing lead", async () => {
        const lead = await createLead({
            name: "Delete Test",
            email: "delete@example.com",
            company: "Test Company",
        });

        await deleteLead(lead.id);

        try {
            await getLeadById(lead.id);
        } catch (error) {
            if (error instanceof NotFoundError) return;
            throw error;
        }

        throw new Error("Lead still exists after deletion");
    });

    // 9. Deleting a nonexistent lead
    await test("Deleting missing lead throws NotFoundError", async () => {
        try {
            await deleteLead(999);
        } catch (error) {
            if (error instanceof NotFoundError) return;
            throw error;
        }
        throw new Error("Expected NotFoundError");
    });

    // 10. listLeads returns a separate array
    await test("listLeads returns an array copy", async () => {
        const originalCount = (await listLeads()).length;
        const copiedLeads = await listLeads();

        copiedLeads.pop();

        if ((await listLeads()).length !== originalCount) {
            throw new Error("Original array was modified");
        }
    });

    // 11. Filter by status
    await test("listLeads filters by status", async () => {
        const qualifiedLeads = await listLeads("qualified");

        if (!qualifiedLeads.every((lead) => lead.status === "qualified")) {
            throw new Error("Incorrect status returned");
        }
    });

    console.log("\nAll test cases finished.");
}

async function compareTimings(): Promise<void> {
    // Sequential calls
    const start1 = Date.now();

    await getLeadById(1);
    await getLeadById(2);
    await getLeadById(3);

    const sequentialTime = Date.now() - start1;

    // Concurrent calls
    const start2 = Date.now();

    await Promise.all([
        getLeadById(1),
        getLeadById(2),
        getLeadById(3)
    ]);

    const concurrentTime = Date.now() - start2;

    console.log("Sequential:", sequentialTime, "ms");
    console.log("Concurrent:", concurrentTime, "ms");
} 

main().catch((error) => {
    console.error("Test runner failed unexpectedly:", error);
    
});
await compareTimings();