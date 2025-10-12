import { Router } from "express";
import { approveVendorController, rejectVendorController } from "../controllers/vendorController";

const router = express.Router();

router.post("/:id/approve", approveVendorController);
router.post("/:id/reject", rejectVendorController);
router.post("/apply-bazaar", vendorController.applyToBazaar);

export default router;
