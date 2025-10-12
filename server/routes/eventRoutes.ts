// server/routes/eventRoutes.ts
import { Request, Response, Router } from "express";
import eventController from "../controllers/eventController";
import { deleteEventById } from "../services/eventService";

const router = Router();

// quick check route
router.get("/events/health", (_req, res) => res.json({ ok: true }));

// EventOffice/Admin deletes any event
router.delete("/events/:eventId", (req, res) =>
  eventController.deleteAnyEvent(req, res)
);

export default router;
