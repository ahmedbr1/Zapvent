import { Router } from "express";
import {getAllEventsController} from "../controllers/eventController";

const router = Router();

router.get("/", getAllEventsController);

export default router;