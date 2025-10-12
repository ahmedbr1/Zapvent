import { Router } from "express";
import { allowedRoles } from "../middleware/authMiddleware";
import {
  createBazaarController,
  getAllEventsController,
} from "../controllers/eventController";
import { editGymSessionController } from "../controllers/gymSessionController";

const router = Router();

router.get("/", getAllEventsController);
router.post("/", createBazaarController);
router.put("/:id", allowedRoles(["EventsOffice"]), editGymSessionController);
export default router;
