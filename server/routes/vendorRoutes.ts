import { Router } from "express";
import vendorController from "../controllers/vendorController";
const router = Router();

router.post("/apply-bazaar", vendorController.applyToBazaar);

export default router;
