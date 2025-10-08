// server/services/eventService.ts
import { Types } from 'mongoose';
import  Event  from '../models/Event';
import  Comment  from '../models/Comment';
import  Rating  from '../models/Rating';

export async function deleteEventById(eventId: string) {
  if (!Types.ObjectId.isValid(eventId)) {
    throw new Error('INVALID_EVENT_ID');
  }

  const event = await Event.findById(eventId);
  if (!event) return null;

  // OPTIONAL: cleanup related docs if they reference Event by id
  await Promise.allSettled([
    Comment.deleteMany({ event: event._id }),
    Rating.deleteMany({ event: event._id }),
  ]);

  await event.deleteOne(); // or Event.findByIdAndDelete(eventId)
  return event;
}
