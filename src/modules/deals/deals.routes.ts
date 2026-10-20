import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
    createDealSchema,
    leadParamsSchema,
    dealParamsSchema,
    changeStageSchema,
} from "./deals.schemas.js";
import {
    listDeals,
    createDeal,
    deleteDeal,
    changeStage,
} from "./deals.service.js";
import { requireOrganization } from "../../middleware/organization.js";

const router = Router({ mergeParams: true });
router.use(requireOrganization);

router.get("/", validate(leadParamsSchema, "params"), async (_req, res) => {
    const orgId = res.locals.organizationId;
    const { leadId } = res.locals.params;

    const result = await listDeals(orgId, leadId);
    res.status(200).json(result);
});

router.post(
    "/",
    validate(leadParamsSchema, "params"),
    validate(createDealSchema, "body"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId } = res.locals.params;
        const input = res.locals.body;

        const result = await createDeal(orgId, leadId, input);
        res.status(201).json(result);
    },
);

router.patch(
    "/:id/stage",
    validate(dealParamsSchema, "params"),
    validate(changeStageSchema, "body"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId, id } = res.locals.params;
        const { stage } = res.locals.body;

        const result = await changeStage(orgId, leadId, id, stage);
        res.status(200).json(result);
    },
);

router.delete(
    "/:id",
    validate(dealParamsSchema, "params"),
    async (_req, res) => {
        const orgId = res.locals.organizationId;
        const { leadId, id } = res.locals.params;

        await deleteDeal(orgId, leadId, id);

        res.status(204).end();
    },
);

export default router;
