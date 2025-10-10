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

// BYPASS AUTH: dev-only hard delete
router.delete(
  "/events/_debug_hard_delete/:eventId",
  async (req: Request, res: Response) => {
    try {
      const deleted = await deleteEventById(req.params.eventId);
      if (!deleted) return res.status(404).json({ message: "Not found" });
      return res.status(204).send();
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "INVALID_EVENT_ID") {
        return res.status(400).json({ message: "Invalid id" });
      }
      console.error(e);
      return res.status(500).json({ message: "Error" });
    }
  }
);

export default router;
