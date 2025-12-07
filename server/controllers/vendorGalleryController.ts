import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import * as vendorGalleryService from "../services/vendorGalleryService";
import { MediaType, GalleryItemCategory } from "../models/VendorGalleryItem";
import fs from "fs/promises";

export class VendorGalleryController {
  async addGalleryItem(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }

    // Determine media type
    let mediaType: MediaType;
    if (file.mimetype.startsWith("video/")) {
      mediaType = MediaType.VIDEO;
    } else if (file.mimetype.startsWith("image/")) {
      mediaType = MediaType.IMAGE;
    } else {
      await fs.unlink(file.path).catch(() => {});
      return res
        .status(400)
        .json({
          success: false,
          message: "Only video and image files are allowed.",
        });
    }

    const category =
      (req.body.category as GalleryItemCategory) || GalleryItemCategory.OTHER;
    if (!Object.values(GalleryItemCategory).includes(category)) {
      await fs.unlink(file.path).catch(() => {});
      return res
        .status(400)
        .json({ success: false, message: "Invalid category." });
    }

    const result = await vendorGalleryService.addGalleryItem(req.user.id, {
      title: req.body.title || file.originalname,
      description: req.body.description,
      filePath: file.path,
      mediaType,
      category,
      eventId: req.body.eventId,
      fileSize: file.size,
    });

    if (!result.success) {
      await fs.unlink(file.path).catch(() => {});
    }

    return res
      .status(result.statusCode || (result.success ? 201 : 400))
      .json(result);
  }

  async getMyGallery(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const category = req.query.category as GalleryItemCategory | undefined;
    const result = await vendorGalleryService.getVendorGallery(
      req.user.id,
      category
    );
    return res.status(result.success ? 200 : 400).json(result);
  }

  async getPublicGallery(req: AuthRequest, res: Response) {
    const { vendorId } = req.params;
    const result = await vendorGalleryService.getPublicVendorGallery(vendorId);
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async updateGalleryItem(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { itemId } = req.params;
    const { title, description, category } = req.body;

    const result = await vendorGalleryService.updateGalleryItem(
      itemId,
      req.user.id,
      {
        title,
        description,
        category,
      }
    );

    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async deleteGalleryItem(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { itemId } = req.params;
    const result = await vendorGalleryService.deleteGalleryItem(
      itemId,
      req.user.id
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }

  async reorderGallery(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res
        .status(400)
        .json({ success: false, message: "Items array is required." });
    }

    const result = await vendorGalleryService.reorderGalleryItems(
      req.user.id,
      items
    );
    return res
      .status(result.statusCode || (result.success ? 200 : 400))
      .json(result);
  }
}

const vendorGalleryController = new VendorGalleryController();
export default vendorGalleryController;
