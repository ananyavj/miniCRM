//src/modules/leads/leads.routes.ts
import { Router } from "express";
import {
    listLeads,
    getLeadById,
    createLead,
    updateLeadStatus,
    deleteLead,
    assignLead,
} from "./leads.service.js";
import { validate } from "../../middleware/validate.js";
import {
    leadIdSchema,
    listLeadsQuerySchema,
    createLeadSchema,
    updateLeadStatusSchema,
    assignLeadSchema,
} from "./leads.schemas.js";
import { requireOrganization } from "../../middleware/organization.js";

const router = Router();
// TEMP: replaced by token on Day 24
router.use(requireOrganization);

router.get("/", validate(listLeadsQuerySchema, "query"), async (req, res) => {
    const organizationId: number = res.locals.organizationId;
    const { status } = res.locals.query;
    const leads = await listLeads(organizationId, status);
    res.status(200).json(leads);
});

router.get("/:id", validate(leadIdSchema, "params"), async (req, res) => {
    const organizationId: number = res.locals.organizationId;
    const { id } = res.locals.params;
    const lead = await getLeadById(organizationId, id);
    res.status(200).json(lead);
});

router.post("/", validate(createLeadSchema, "body"), async (req, res) => {
    const organizationId: number = res.locals.organizationId;
    const input = res.locals.body;
    const newLead = await createLead(organizationId, input);
    res.status(201).json(newLead);
});

router.patch(
    "/:id",
    validate(leadIdSchema, "params"),
    validate(updateLeadStatusSchema, "body"),
    async (req, res) => {
        const organizationId: number = res.locals.organizationId;
        const { id } = res.locals.params;
        const { status } = res.locals.body;

        const updatedlead = await updateLeadStatus(organizationId, id, status);
        res.status(200).json(updatedlead);
    },
);

router.patch(
    "/:id/assignment",
    validate(leadIdSchema, "params"),
    validate(assignLeadSchema, "body"),
    async (req, res) => {
        const organizationId: number = res.locals.organizationId;
        const { id } = res.locals.params;
        const { userId } = res.locals.body;

        const updatedLead = await assignLead(organizationId, id, userId);

        res.status(200).json(updatedLead);
    },
);
router.delete("/:id", validate(leadIdSchema, "params"), async (req, res) => {
    const organizationId: number = res.locals.organizationId;
    const { id } = res.locals.params;
    await deleteLead(organizationId, id);
    res.status(204).end();
});

export default router;
