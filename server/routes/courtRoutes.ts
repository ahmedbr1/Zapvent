import { Router } from "express";
import { viewAllCourts } from "../controllers/courtController";

const router = Router();

router.get("/", viewAllCourts);

export default router;