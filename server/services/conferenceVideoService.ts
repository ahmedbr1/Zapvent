import { Types } from "mongoose";
import ConferenceVideoModel, {
  IConferenceVideo,
  MediaType,
} from "../models/ConferenceVideo";
import EventModel, { EventType, IEvent } from "../models/Event";
import AdminModel, { IAdmin } from "../models/Admin";
import fs from "fs/promises";

// ============ Types ============

export interface UploadVideoInput {
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  thumbnailPath?: string;
  duration?: number;
  fileSize: number;
}

export interface ConferenceVideoSummary {
  id: string;
  eventId: string;
  eventName?: string;
  uploadedBy: string;
  uploaderName: string;
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  thumbnailPath?: string;
  duration?: number;
  fileSize: number;
  createdAt: Date;
}

interface ServiceResponse<T = undefined> {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
}

// ============ Helper Functions ============

function serializeVideo(
  video: IConferenceVideo & { _id: Types.ObjectId },
  eventName?: string
): ConferenceVideoSummary {
  return {
    id: video._id.toString(),
    eventId: video.eventId.toString(),
    eventName,
    uploadedBy: video.uploadedBy.toString(),
    uploaderName: video.uploaderName,
    title: video.title,
    description: video.description,
    filePath: video.filePath,
    mediaType: video.mediaType,
    thumbnailPath: video.thumbnailPath,
    duration: video.duration,
    fileSize: video.fileSize,
    createdAt: video.createdAt!,
  };
}

// ============ Upload Video ============

export async function uploadConferenceVideo(
  eventId: string,
  userId: string,
  input: UploadVideoInput
): Promise<ServiceResponse<ConferenceVideoSummary>> {
  // Validate event ID
  if (!Types.ObjectId.isValid(eventId)) {
    return { success: false, message: "Invalid event ID.", statusCode: 400 };
  }

  // Validate input
  if (!input.title?.trim()) {
    return { success: false, message: "Title is required.", statusCode: 400 };
  }
  if (!input.filePath) {
    return {
      success: false,
      message: "File path is required.",
      statusCode: 400,
    };
  }

  // Find the event
  const event = await EventModel.findById(eventId).lean<
    IEvent & { _id: Types.ObjectId }
  >();
  if (!event) {
    return { success: false, message: "Event not found.", statusCode: 404 };
  }

  // Check if it's a conference
  if (event.eventType !== EventType.CONFERENCE) {
    return {
      success: false,
      message: "Videos can only be uploaded for conferences.",
      statusCode: 400,
    };
  }

  // Check if conference has ended
  if (new Date(event.endDate) > new Date()) {
    return {
      success: false,
      message: "Videos can only be uploaded after the conference has ended.",
      statusCode: 400,
    };
  }

  // Find the admin (EventOffice)
  const admin = await AdminModel.findById(userId).lean<
    IAdmin & { _id: Types.ObjectId }
  >();
  if (!admin) {
    return { success: false, message: "Admin not found.", statusCode: 404 };
  }

  // Check if admin is EventOffice
  if (admin.adminType !== "EventOffice") {
    return {
      success: false,
      message: "Only Event Office can upload conference videos.",
      statusCode: 403,
    };
  }

  // Create video record
  const uploaderName = `${admin.firstName} ${admin.lastName}`.trim();
  const video = new ConferenceVideoModel({
    eventId: new Types.ObjectId(eventId),
    uploadedBy: new Types.ObjectId(userId),
    uploaderName,
    title: input.title.trim(),
    description: input.description?.trim(),
    filePath: input.filePath,
    mediaType: input.mediaType,
    thumbnailPath: input.thumbnailPath,
    duration: input.duration,
    fileSize: input.fileSize,
  });

  await video.save();

  return {
    success: true,
    message: "Video uploaded successfully.",
    data: serializeVideo(
      video.toObject() as IConferenceVideo & { _id: Types.ObjectId },
      event.name
    ),
  };
}

// ============ Get Videos ============

export async function getConferenceVideos(
  eventId: string
): Promise<ServiceResponse<ConferenceVideoSummary[]>> {
  if (!Types.ObjectId.isValid(eventId)) {
    return { success: false, message: "Invalid event ID.", statusCode: 400 };
  }

  const event = await EventModel.findById(eventId).lean<
    IEvent & { _id: Types.ObjectId }
  >();
  if (!event) {
    return { success: false, message: "Event not found.", statusCode: 404 };
  }

  const videos = await ConferenceVideoModel.find({
    eventId: new Types.ObjectId(eventId),
  })
    .sort({ createdAt: -1 })
    .lean<Array<IConferenceVideo & { _id: Types.ObjectId }>>();

  return {
    success: true,
    message: "Videos retrieved successfully.",
    data: videos.map((v) => serializeVideo(v, event.name)),
  };
}

export async function getUploaderVideos(
  userId: string
): Promise<ServiceResponse<ConferenceVideoSummary[]>> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const videos = await ConferenceVideoModel.find({
    uploadedBy: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean<Array<IConferenceVideo & { _id: Types.ObjectId }>>();

  // Get event names
  const eventIds = [...new Set(videos.map((v) => v.eventId.toString()))];
  const events = await EventModel.find({ _id: { $in: eventIds } })
    .select("name")
    .lean<Array<{ _id: Types.ObjectId; name: string }>>();

  const eventNameMap = new Map(events.map((e) => [e._id.toString(), e.name]));

  return {
    success: true,
    message: "Videos retrieved successfully.",
    data: videos.map((v) =>
      serializeVideo(v, eventNameMap.get(v.eventId.toString()))
    ),
  };
}

// ============ Delete Video ============

export async function deleteConferenceVideo(
  videoId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(videoId)) {
    return { success: false, message: "Invalid video ID.", statusCode: 400 };
  }

  const video = await ConferenceVideoModel.findById(videoId);
  if (!video) {
    return { success: false, message: "Video not found.", statusCode: 404 };
  }

  // Only uploader or admin can delete
  if (video.uploadedBy.toString() !== userId && !isAdmin) {
    return {
      success: false,
      message: "You are not authorized to delete this video.",
      statusCode: 403,
    };
  }

  // Delete file from filesystem
  try {
    await fs.unlink(video.filePath);
    if (video.thumbnailPath) {
      await fs.unlink(video.thumbnailPath).catch(() => {
        /* ignore if thumbnail doesn't exist */
      });
    }
  } catch {
    // Log but don't fail if file deletion fails
    console.error(`Failed to delete video file: ${video.filePath}`);
  }

  await ConferenceVideoModel.findByIdAndDelete(videoId);

  return { success: true, message: "Video deleted successfully." };
}

// ============ Update Video ============

export async function updateConferenceVideo(
  videoId: string,
  userId: string,
  updates: { title?: string; description?: string }
): Promise<ServiceResponse<ConferenceVideoSummary>> {
  if (!Types.ObjectId.isValid(videoId)) {
    return { success: false, message: "Invalid video ID.", statusCode: 400 };
  }

  const video = await ConferenceVideoModel.findById(videoId);
  if (!video) {
    return { success: false, message: "Video not found.", statusCode: 404 };
  }

  if (video.uploadedBy.toString() !== userId) {
    return {
      success: false,
      message: "You are not authorized to update this video.",
      statusCode: 403,
    };
  }

  if (updates.title?.trim()) {
    video.title = updates.title.trim();
  }
  if (updates.description !== undefined) {
    video.description = updates.description.trim() || undefined;
  }

  await video.save();

  const event = await EventModel.findById(video.eventId)
    .select("name")
    .lean<{ name: string }>();

  return {
    success: true,
    message: "Video updated successfully.",
    data: serializeVideo(
      video.toObject() as IConferenceVideo & { _id: Types.ObjectId },
      event?.name
    ),
  };
}

// ============ Get Conferences with Videos ============

export async function getConferencesWithVideos(): Promise<
  ServiceResponse<
    Array<{ eventId: string; eventName: string; videoCount: number }>
  >
> {
  const result = await ConferenceVideoModel.aggregate([
    { $group: { _id: "$eventId", videoCount: { $sum: 1 } } },
    {
      $lookup: {
        from: "events",
        localField: "_id",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },
    {
      $project: {
        eventId: { $toString: "$_id" },
        eventName: "$event.name",
        videoCount: 1,
        _id: 0,
      },
    },
    { $sort: { videoCount: -1 } },
  ]);

  return {
    success: true,
    message: "Conferences retrieved successfully.",
    data: result,
  };
}

// ============ Get Eligible Conferences for Event Office ============

export async function getEligibleConferences(userId: string): Promise<
  ServiceResponse<
    Array<{
      eventId: string;
      eventName: string;
      endDate: Date;
      videoCount: number;
    }>
  >
> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  // Verify the admin exists and is EventOffice
  const admin = await AdminModel.findById(userId).lean<
    IAdmin & { _id: Types.ObjectId }
  >();
  if (!admin) {
    return { success: false, message: "Admin not found.", statusCode: 404 };
  }

  if (admin.adminType !== "EventOffice") {
    return {
      success: false,
      message: "Only Event Office can access this resource.",
      statusCode: 403,
    };
  }

  // Get all completed conferences
  const conferences = await EventModel.find({
    eventType: EventType.CONFERENCE,
    endDate: { $lt: new Date() },
  })
    .select("_id name endDate")
    .sort({ endDate: -1 })
    .lean<Array<{ _id: Types.ObjectId; name: string; endDate: Date }>>();

  // Get video counts for each conference
  const videoCounts = await ConferenceVideoModel.aggregate([
    {
      $match: {
        eventId: { $in: conferences.map((c) => c._id) },
      },
    },
    { $group: { _id: "$eventId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(videoCounts.map((v) => [v._id.toString(), v.count]));

  return {
    success: true,
    message: "Eligible conferences retrieved successfully.",
    data: conferences.map((conf) => ({
      eventId: conf._id.toString(),
      eventName: conf.name,
      endDate: conf.endDate,
      videoCount: countMap.get(conf._id.toString()) || 0,
    })),
  };
}
