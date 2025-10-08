// server/routes/eventRoutes.ts
import { Router } from 'express';
import eventController from '../controllers/eventController';

const router = Router();

// EventOffice/Admin deletes any event
router.delete('/events/:eventId', (req, res, next) =>
  eventController.deleteAnyEvent(req, res, next)
);

export default router;
