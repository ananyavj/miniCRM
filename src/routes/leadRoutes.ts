import {Router} from "express";
import { listLeads } from "../services/leadService.js";


const router = Router();

router.get("/", async (req, res) => {
    const leads = await listLeads();
    res.status(200).json(leads);
});

export default router;