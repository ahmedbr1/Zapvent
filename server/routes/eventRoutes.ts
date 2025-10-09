import { Router } from "express";
import {
  updateBazaarDetails,
  createNewTrip,
  updateTripDetails,
} from "../controllers/eventController";
import { adminRequired } from "../middleware/authMiddleware";

const router = Router();

router.put("/:id", adminRequired, updateBazaarDetails);
router.post("/trip", adminRequired, createNewTrip);
router.put("/trip/:id", adminRequired, updateTripDetails);

export default router;
