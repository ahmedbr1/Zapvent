import { Router } from "express";
import {
  getUsers,
  createUser,
  getUserRegisteredEvents,
} from "../controllers/userController";

const router = Router();

router.get("/:userId/registered-events", getUserRegisteredEvents);
router.post("/", createUser);
router.get("/all", getUsers);

export default router;
