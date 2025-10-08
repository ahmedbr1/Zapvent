import { Router } from "express";
import { getUsers, createUser, signup } from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.post("/signUp", signup);

export default router;
