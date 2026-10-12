import {Router} from "express";
import { listLeads , getLeadById, createLead, updateLeadStatus, deleteLead} from "../services/leadService.js";
import { validate } from "../middleware/validate.js";
import { leadIdSchema, listLeadsQuerySchema, createLeadSchema, updateLeadStatusSchema } from "../schemas/leadSchemas.js";


const router = Router();

router.get("/", validate(listLeadsQuerySchema, "query"),async (req, res) => {
    const {status} = res.locals.query;
    const leads = await listLeads(status);
    res.status(200).json(leads);
});

router.get("/:id", validate(leadIdSchema, "params") ,async (req, res) => {
    const { id } = res.locals.params;
    const lead = await getLeadById(id);
    res.status(200).json(lead);
});

router.post("/",validate(createLeadSchema, "body"), async(req, res) => {
    const input = res.locals.body;
    const newLead = await createLead(input);
    res.status(201).json(newLead);
})

router.patch("/:id", validate(leadIdSchema, "params"), validate(updateLeadStatusSchema, "body"), async(req, res) => {
    const { id } = res.locals.params;
    const { status } = res.locals.body;

    await updateLeadStatus(id, status);
    const updatedlead = await getLeadById(id);
    res.status(200).json(updatedlead)
});

router.delete("/:id", validate(leadIdSchema, "params"), async(req, res) => {
    const { id } = res.locals.params;
    await deleteLead(id);
    res.status(204).end();
});

export default router;