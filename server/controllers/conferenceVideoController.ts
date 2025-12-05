import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import * as conferenceVideoService from "../services/conferenceVideoService";
import { MediaType } from "../models/ConferenceVideo";
import fs from "fs/promises";

export class ConferenceVideoController {
  async uploadVideo(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { eventId } = req.params;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }

    // Determine media type from mimetype
    let mediaType: MediaType;
    if (file.mimetype.startsWith("video/")) {
      mediaType = MediaType.VIDEO;
    } else if (file.mimetype.startsWith("image/")) {
      mediaType = MediaType.IMAGE;
    } else {
      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: "Only video and image files are allowed.",
      });
    }

    const result = await conferenceVideoService.uploadConferenceVideo(
      eventId,
      req.user.id,
      {
        title: req.body.title || file.originalname,
        description: req.body.description,
        filePath: file.path,
        mediaType,
        fileSize: file.size,
        duration: req.body.duration ? parseInt(req.body.duration) : undefined,
      }
    );

    if (!result.success) {
      // Clean up uploaded file on failure
      await fs.unlink(file.path).catch(() => {});
    }

    return res
      .status(result.statusCode || (result.success ? 201 : 400))
      .json(result);
  }

  async getConferenceVideos(req: AuthRequest, res: Response) {
    const { eventId } = req.params;
    const result = await conferenceVideoService.getConferenceVideos(eventId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async getProfessorVideos(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const result = await conferenceVideoService.getProfessorVideos(req.user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async deleteVideo(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { videoId } = req.params;
    const isAdmin = req.user.role === "Admin";

    const result = await conferenceVideoService.deleteConferenceVideo(
      videoId,
      req.user.id,
      isAdmin
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async updateVideo(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { videoId } = req.params;
    const { title, description } = req.body;

    const result = await conferenceVideoService.updateConferenceVideo(
      videoId,
      req.user.id,
      {
        title,
        description,
      }
    );

    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async getConferencesWithVideos(_req: AuthRequest, res: Response) {
    const result = await conferenceVideoService.getConferencesWithVideos();
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getEligibleConferences(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const result =
      await conferenceVideoService.getEligibleConferencesForProfessor(
        req.user.id
      );
    return res.status(result.success ? 200 : 400).json(result);
  }
}

const conferenceVideoController = new ConferenceVideoController();
export default conferenceVideoController;
