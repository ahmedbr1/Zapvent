import mongoose, { Schema, Types } from "mongoose";
import { IBaseModel } from "./BaseModel";

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
}

export enum GalleryItemCategory {
  PRODUCT = "product",
  BOOTH = "booth",
  EVENT = "event",
  OTHER = "other",
}

export interface IVendorGalleryItem extends IBaseModel {
  vendorId: Types.ObjectId;
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  category: GalleryItemCategory;
  thumbnailPath?: string;
  eventId?: Types.ObjectId; // Optional reference to a bazaar/event
  eventName?: string;
  fileSize: number;
  order: number; // For custom ordering
}

const VendorGalleryItemSchema = new Schema<IVendorGalleryItem>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    filePath: { type: String, required: true },
    mediaType: { type: String, enum: Object.values(MediaType), required: true },
    category: {
      type: String,
      enum: Object.values(GalleryItemCategory),
      required: true,
    },
    thumbnailPath: { type: String },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    eventName: { type: String },
    fileSize: { type: Number, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
VendorGalleryItemSchema.index({ vendorId: 1, order: 1 });
VendorGalleryItemSchema.index({ vendorId: 1, category: 1 });
VendorGalleryItemSchema.index({ createdAt: -1 });

const VendorGalleryItemModel =
  mongoose.models.VendorGalleryItem ||
  mongoose.model<IVendorGalleryItem>(
    "VendorGalleryItem",
    VendorGalleryItemSchema
  );

export default VendorGalleryItemModel;
