//src/modules/contacts/contacts.routes.ts
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
    createContactSchema,
    leadParamsSchema,
    contactParamsSchema,
    updateContactSchema,
} from "./contacts.schemas.js";
import {
    listContacts,
    createContact,
    getContact,
    updateContact,
    deleteContact,
} from "./contacts.service.js";
import { requireOrganization } from "../../middleware/organization.js";

const router = Router({ mergeParams: true });
router.use(requireOrganization);

router.get("/", validate(leadParamsSchema, "params"), async (_req, res) => {
    const orgId = res.locals.organizationId;
    const { leadId } = res.locals.params;
    const result = await listContacts(orgId, leadId);
    res.status(200).json(result);
});

router.post(
    "/",
    validate(leadParamsSchema, "params"),
    validate(createContactSchema, "body"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId } = res.locals.params;
        const input = res.locals.body;
        const result = await createContact(orgId, leadId, input);
        res.status(201).json(result);
    },
);

router.get(
    "/:id",
    validate(contactParamsSchema, "params"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId, id } = res.locals.params;
        const result = await getContact(orgId, leadId, id);
        res.status(200).json(result);
    },
);

router.patch(
    "/:id",
    validate(contactParamsSchema, "params"),
    validate(updateContactSchema, "body"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId, id } = res.locals.params;
        const input = res.locals.body;
        const result = await updateContact(orgId, leadId, id, input);
        res.status(200).json(result);
    },
);

router.delete(
    "/:id",
    validate(contactParamsSchema, "params"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId, id } = res.locals.params;
        await deleteContact(orgId, leadId, id);
        res.status(204).end();
    },
);

export default router;
