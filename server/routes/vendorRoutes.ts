import { Router } from "express";
import vendorController from "../controllers/vendorController";
const router = Router();

router.post("/apply-bazaar", vendorController.applyToBazaar);
router.patch("/bazaar-application/status", vendorController.updateBazaarApplicationStatus);

export default router;
