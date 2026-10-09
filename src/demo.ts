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

try{
    const newLead = createLead({
        name: "Maya Sharma",
        email: "maya@example.com",
        company: "Bright Systems",
    });
    console.log(newLead);
}
catch(error)
{
    if(error instanceof NotFoundError)
    {
        console.log("The requested lead was not found.");
    }
    else if(error instanceof ValidationError)
    {
        console.log("The lead data is invalid.");
    }
    else if(error instanceof DuplicateIdError)
    {
        console.log("A lead with that ID already exists.");
    }
    else{
        console.log("An unexpected error occurred.");
    }
}

const copiedLeads = listLeads();

copiedLeads.pop();

console.log("Leads in original data:", listLeads().length);
console.log("Leads in copied array:", copiedLeads.length);