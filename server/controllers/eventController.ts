// server/controllers/eventController.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware';
import { LoginRequired, AllowedRoles } from '../middleware/authDecorators';
import { deleteEventById } from '../services/eventService';

class eventController {

  @LoginRequired()
  @AllowedRoles(['Admin']) // should add the 'EventOffice' also
  async deleteAnyEvent(req: AuthRequest, res: Response, _next: NextFunction) {
    try {
      const { eventId } = req.params as { eventId: string };
      const deleted = await deleteEventById(eventId);

      if (!deleted) {
        return res.status(404).json({ message: 'Event not found' });
      }
      return res.status(204).send();
    } catch (err: any) {
      if (err?.message === 'INVALID_EVENT_ID') {
        return res.status(400).json({ message: 'Invalid event id' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Failed to delete event' });
    }
  }
}

export default new eventController();
