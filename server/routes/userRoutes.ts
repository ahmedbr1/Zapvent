import { Router } from "express";
import { userController } from "../controllers/userController";

const router = Router();



router.post("/signUp", userController.signup.bind(userController));
router.get("/:userId/registered-events", userController.getUserRegisteredEvents.bind(userController));


export default router;