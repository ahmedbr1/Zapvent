import eventModel from "../models/Event";
import { IEvent } from "../models/Event";

export const editBazaarDetails = async (
  eventId: string,
  updateData: Partial<IEvent>
): Promise<IEvent | null> => {
  try {
    const updatedEvent = await eventModel.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true }
    );
    return updatedEvent;
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};
