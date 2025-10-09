import { Router } from "express";
import {
  updateBazaarDetails,
  createNewTrip,
  updateTripDetails,
} from "../controllers/eventController";

const router = Router();

router.put("/:id", updateBazaarDetails);
router.post("/trip", createNewTrip);
router.put("/trip/:id", updateTripDetails);

export default router;
