import { Router } from "express";
import LoginController from "../controllers/loginController";

const router = Router();
const loginController = new LoginController();

router.post("/login/user", loginController.userLoginController);
router.post("/login/admin", loginController.adminLoginController);
router.post("/login/vendor", loginController.vendorLoginController);
router.get("/verify-email", loginController.verifyEmailLink);

export default router;
