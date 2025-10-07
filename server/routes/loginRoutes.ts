import { Router } from "express";
import {
  adminLoginController,
  userLoginController,
  vendorLoginController,
} from "../controllers/loginController";

const router = Router();

router.post("/login/user", userLoginController);
router.post("/login/admin", adminLoginController);
router.post("/login/vendor", vendorLoginController);

export default router;
