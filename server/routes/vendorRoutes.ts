import { Router } from "express";
import { vendorControllerInstance } from "../controllers/vendorController"; // Import instance

const router = Router();

router.post("/signUp", vendorControllerInstance.vendorSignup.bind(vendorControllerInstance));

export default router;