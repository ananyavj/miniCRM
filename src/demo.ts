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

function test(name: string, action: () => void): void {
  try {
    action();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.log(`FAIL: ${name}`, error);
  }
}

// 1. Retrieve an existing lead
test("Get existing lead", () => {
  const lead = getLeadById(1);
  if (lead.id !== 1) throw new Error("Incorrect lead returned");
});

// 2. Missing lead throws NotFoundError
test("Missing lead throws NotFoundError", () => {
  try {
    getLeadById(999);
  } catch (error) {
    if (error instanceof NotFoundError) return;
    throw error;
  }
  throw new Error("Expected NotFoundError");
});

// 3. Duplicate ID throws DuplicateIdError
test("Duplicate ID is rejected", () => {
  try {
    addLead({
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
test("Empty name is rejected", () => {
  try {
    createLead({
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
test("Invalid email is rejected", () => {
  try {
    createLead({
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
test("Create a lead with defaults", () => {
  const lead = createLead({
    name: "Maya Sharma",
    email: "maya@example.com",
    company: "Bright Systems",
  });

  if (lead.id <= 0) throw new Error("Invalid ID");
  if (lead.status !== "new") throw new Error("Incorrect default status");
  if ("phone" in lead) throw new Error("Phone should be omitted");
});

// 7. Updating a lead
test("Update lead status", () => {
  const lead = createLead({
    name: "Update Test",
    email: "update@example.com",
    company: "Test Company",
  });

  updateLeadStatus(lead.id, "qualified");

  if (getLeadById(lead.id).status !== "qualified") {
    throw new Error("Status was not updated");
  }
});

// 8. Deleting an existing lead
test("Delete an existing lead", () => {
  const lead = createLead({
    name: "Delete Test",
    email: "delete@example.com",
    company: "Test Company",
  });

  deleteLead(lead.id);

  try {
    getLeadById(lead.id);
  } catch (error) {
    if (error instanceof NotFoundError) return;
    throw error;
  }

  throw new Error("Lead still exists after deletion");
});

// 9. Deleting a nonexistent lead
test("Deleting missing lead throws NotFoundError", () => {
  try {
    deleteLead(999);
  } catch (error) {
    if (error instanceof NotFoundError) return;
    throw error;
  }
  throw new Error("Expected NotFoundError");
});

// 10. listLeads returns a separate array
test("listLeads returns an array copy", () => {
  const originalCount = listLeads().length;
  const copiedLeads = listLeads();

  copiedLeads.pop();

  if (listLeads().length !== originalCount) {
    throw new Error("Original array was modified");
  }
});

// 11. Filter by status
test("listLeads filters by status", () => {
  const qualifiedLeads = listLeads("qualified");

  if (!qualifiedLeads.every((lead) => lead.status === "qualified")) {
    throw new Error("Incorrect status returned");
  }
});

console.log("\nAll test cases finished.");