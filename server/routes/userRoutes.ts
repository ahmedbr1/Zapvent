import { Router } from "express";
import { userController } from "../controllers/userController";

const router = Router();

router.post("/signUp", userController.signup.bind(userController));

export default router;