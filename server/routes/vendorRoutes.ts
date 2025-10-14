import { Router } from "express";
import vendorController from "../controllers/vendorController";

const router = Router();

router.post("/signUp", vendorController.vendorSignup.bind(vendorController));

router.post(
  "/apply-bazaar",
  vendorController.applyToBazaar.bind(vendorController)
);
router.patch(
  "/bazaar-application/status",
  vendorController.updateBazaarApplicationStatus.bind(vendorController)
);

export default router;
