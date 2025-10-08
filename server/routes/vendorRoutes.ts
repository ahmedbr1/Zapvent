import { Router } from "express";
import { vendorSignup } from "../controllers/vendorController";

const router = Router();

router.post("/signUp", vendorSignup);

export default router;