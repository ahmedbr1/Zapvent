import { Router } from "express";
import { vendorControllerInstance } from "../controllers/vendorController"; // Import instance
import vendorController from "../controllers/vendorController";


const router = Router();

router.post("/signUp", vendorControllerInstance.vendorSignup.bind(vendorControllerInstance));


router.post("/apply-bazaar", vendorController.applyToBazaar);

export default router;
