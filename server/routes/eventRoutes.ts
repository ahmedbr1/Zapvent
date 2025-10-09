import { Router } from "express";
import { updateBazaarDetails } from "../controllers/eventController";

const router = Router();

router.put("/:id", updateBazaarDetails);

export default router;
