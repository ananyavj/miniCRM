import {Router} from "express";
import { listLeads , getLeadById, createLead, updateLeadStatus, deleteLead} from "../services/leadService.js";
import { type LeadStatus } from "../models/lead.js";
import { ValidationError } from "../errors.js";


const router = Router();

router.get("/", async (req, res) => {
    const status = req.query.status;
    if(status !== undefined){
        if(typeof status != "string" || !["new", "contacted", "qualified"].includes(status)){
            throw new ValidationError("Invalid lead status");
        }
    }

    const leads = await listLeads(status as LeadStatus | undefined);
    res.status(200).json(leads);
});

router.get("/:id", async (req, res) => {
    const idObj = Number(req.params.id);
    if(!Number.isInteger(idObj) || idObj <= 0)
    {
        throw new ValidationError("Invalid lead ID");
    }
    const lead = await getLeadById(idObj);
    res.status(200).json(lead);
});

router.post("/", async(req, res) => {
    const input = req.body;
    const newLead = await createLead(input);
    res.status(201).json(newLead);
})

router.patch("/:id", async(req, res) => {
    const idObj = Number(req.params.id);
    if(!Number.isInteger(idObj) || idObj <= 0)
    {
        throw new ValidationError("Invalid lead ID");
    }
    const status = req.body.status;
    if(typeof status !== "string" || !["new", "contacted", "qualified"].includes(status))
    {
        throw new ValidationError("Invalid status");
    }
    const validStatus = status as LeadStatus;
    await updateLeadStatus(idObj, validStatus);
    const updatedlead = await getLeadById(idObj);
    res.status(200).json(updatedlead)
});

router.delete("/:id", async(req, res) => {
    const idObj = Number(req.params.id);
    if(!Number.isInteger(idObj) || idObj <= 0)
    {
        throw new ValidationError("Invalid lead ID");
    }
    await deleteLead(idObj);
    res.status(204).end();
});

export default router;