import { Router } from "express";
import { userController } from "../controllers/userController";

const router = Router();

import {
  getUsers,
  createUser,
  getUserRegisteredEvents,
} from "../controllers/userController";

router.post("/signUp", userController.signup.bind(userController));
router.get("/:userId/registered-events", getUserRegisteredEvents);
router.post("/", createUser);
router.get("/all", getUsers);

export default router;