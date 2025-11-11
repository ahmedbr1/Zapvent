import { Router } from "express";
import { pollController } from "../controllers/pollController";
import { loginRequired, allowedRoles } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/:pollId/vote",
  loginRequired,
  allowedRoles(["Student", "Staff", "Professor", "TA"]),
  pollController.voteForVendor.bind(pollController)
);

export default router;
