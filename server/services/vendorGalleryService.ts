import { Types } from "mongoose";
import VendorGalleryItemModel, {
  IVendorGalleryItem,
  MediaType,
  GalleryItemCategory,
} from "../models/VendorGalleryItem";
import VendorModel from "../models/Vendor";
import EventModel from "../models/Event";
import fs from "fs/promises";

// ============ Types ============

export interface AddGalleryItemInput {
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  category: GalleryItemCategory;
  thumbnailPath?: string;
  eventId?: string;
  fileSize: number;
}

export interface GalleryItemSummary {
  id: string;
  vendorId: string;
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  category: GalleryItemCategory;
  thumbnailPath?: string;
  eventId?: string;
  eventName?: string;
  fileSize: number;
  order: number;
  createdAt: Date;
}

interface ServiceResponse<T = undefined> {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
}

// ============ Helper Functions ============

function serializeGalleryItem(
  item: IVendorGalleryItem & { _id: Types.ObjectId }
): GalleryItemSummary {
  return {
    id: item._id.toString(),
    vendorId: item.vendorId.toString(),
    title: item.title,
    description: item.description,
    filePath: item.filePath,
    mediaType: item.mediaType,
    category: item.category,
    thumbnailPath: item.thumbnailPath,
    eventId: item.eventId?.toString(),
    eventName: item.eventName,
    fileSize: item.fileSize,
    order: item.order,
    createdAt: item.createdAt!,
  };
}

// ============ Add Gallery Item ============

export async function addGalleryItem(
  vendorId: string,
  input: AddGalleryItemInput
): Promise<ServiceResponse<GalleryItemSummary>> {
  if (!Types.ObjectId.isValid(vendorId)) {
    return { success: false, message: "Invalid vendor ID.", statusCode: 400 };
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

  // Verify vendor exists
  const vendor = await VendorModel.findById(vendorId);
  if (!vendor) {
    return { success: false, message: "Vendor not found.", statusCode: 404 };
  }

  // Get event name if eventId provided
  let eventName: string | undefined;
  if (input.eventId && Types.ObjectId.isValid(input.eventId)) {
    const event = await EventModel.findById(input.eventId)
      .select("name")
      .lean<{ name: string }>();
    eventName = event?.name;
  }

  // Get max order for this vendor
  const maxOrderItem = await VendorGalleryItemModel.findOne({
    vendorId: new Types.ObjectId(vendorId),
  })
    .sort({ order: -1 })
    .select("order")
    .lean<{ order: number }>();
  const nextOrder = (maxOrderItem?.order ?? -1) + 1;

  const item = new VendorGalleryItemModel({
    vendorId: new Types.ObjectId(vendorId),
    title: input.title.trim(),
    description: input.description?.trim(),
    filePath: input.filePath,
    mediaType: input.mediaType,
    category: input.category,
    thumbnailPath: input.thumbnailPath,
    eventId: input.eventId ? new Types.ObjectId(input.eventId) : undefined,
    eventName,
    fileSize: input.fileSize,
    order: nextOrder,
  });

  await item.save();

  return {
    success: true,
    message: "Gallery item added successfully.",
    data: serializeGalleryItem(
      item.toObject() as IVendorGalleryItem & { _id: Types.ObjectId }
    ),
  };
}

// ============ Get Gallery Items ============

export async function getVendorGallery(
  vendorId: string,
  category?: GalleryItemCategory
): Promise<ServiceResponse<GalleryItemSummary[]>> {
  if (!Types.ObjectId.isValid(vendorId)) {
    return { success: false, message: "Invalid vendor ID.", statusCode: 400 };
  }

  const query: Record<string, unknown> = {
    vendorId: new Types.ObjectId(vendorId),
  };
  if (category) {
    query.category = category;
  }

  const items = await VendorGalleryItemModel.find(query)
    .sort({ order: 1, createdAt: -1 })
    .lean<Array<IVendorGalleryItem & { _id: Types.ObjectId }>>();

  return {
    success: true,
    message: "Gallery items retrieved successfully.",
    data: items.map(serializeGalleryItem),
  };
}

// ============ Update Gallery Item ============

export async function updateGalleryItem(
  itemId: string,
  vendorId: string,
  updates: {
    title?: string;
    description?: string;
    category?: GalleryItemCategory;
  }
): Promise<ServiceResponse<GalleryItemSummary>> {
  if (!Types.ObjectId.isValid(itemId)) {
    return { success: false, message: "Invalid item ID.", statusCode: 400 };
  }

  const item = await VendorGalleryItemModel.findById(itemId);
  if (!item) {
    return {
      success: false,
      message: "Gallery item not found.",
      statusCode: 404,
    };
  }

  // Verify ownership
  if (item.vendorId.toString() !== vendorId) {
    return {
      success: false,
      message: "You are not authorized to update this item.",
      statusCode: 403,
    };
  }

  if (updates.title?.trim()) {
    item.title = updates.title.trim();
  }
  if (updates.description !== undefined) {
    item.description = updates.description.trim() || undefined;
  }
  if (updates.category) {
    item.category = updates.category;
  }

  await item.save();

  return {
    success: true,
    message: "Gallery item updated successfully.",
    data: serializeGalleryItem(
      item.toObject() as IVendorGalleryItem & { _id: Types.ObjectId }
    ),
  };
}

// ============ Delete Gallery Item ============

export async function deleteGalleryItem(
  itemId: string,
  vendorId: string
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(itemId)) {
    return { success: false, message: "Invalid item ID.", statusCode: 400 };
  }

  const item = await VendorGalleryItemModel.findById(itemId);
  if (!item) {
    return {
      success: false,
      message: "Gallery item not found.",
      statusCode: 404,
    };
  }

  // Verify ownership
  if (item.vendorId.toString() !== vendorId) {
    return {
      success: false,
      message: "You are not authorized to delete this item.",
      statusCode: 403,
    };
  }

  // Delete file from filesystem
  try {
    await fs.unlink(item.filePath);
    if (item.thumbnailPath) {
      await fs.unlink(item.thumbnailPath).catch(() => {
        /* ignore */
      });
    }
  } catch {
    console.error(`Failed to delete gallery file: ${item.filePath}`);
  }

  await VendorGalleryItemModel.findByIdAndDelete(itemId);

  return { success: true, message: "Gallery item deleted successfully." };
}

// ============ Reorder Gallery Items ============

export async function reorderGalleryItems(
  vendorId: string,
  itemOrders: Array<{ id: string; order: number }>
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(vendorId)) {
    return { success: false, message: "Invalid vendor ID.", statusCode: 400 };
  }

  // Verify all items belong to vendor
  const itemIds = itemOrders.map((i) => i.id);
  const items = await VendorGalleryItemModel.find({
    _id: { $in: itemIds },
    vendorId: new Types.ObjectId(vendorId),
  }).select("_id");

  if (items.length !== itemIds.length) {
    return {
      success: false,
      message: "Some items not found or don't belong to you.",
      statusCode: 400,
    };
  }

  // Update orders
  const bulkOps = itemOrders.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(id) },
      update: { $set: { order } },
    },
  }));

  await VendorGalleryItemModel.bulkWrite(bulkOps);

  return { success: true, message: "Gallery reordered successfully." };
}

// ============ Get Public Gallery ============

export async function getPublicVendorGallery(
  vendorId: string
): Promise<
  ServiceResponse<{
    vendor: { id: string; companyName: string; logo?: string };
    items: GalleryItemSummary[];
  }>
> {
  if (!Types.ObjectId.isValid(vendorId)) {
    return { success: false, message: "Invalid vendor ID.", statusCode: 400 };
  }

  const vendor = await VendorModel.findById(vendorId)
    .select("companyName logo")
    .lean<{ _id: Types.ObjectId; companyName: string; logo?: string }>();

  if (!vendor) {
    return { success: false, message: "Vendor not found.", statusCode: 404 };
  }

  const items = await VendorGalleryItemModel.find({
    vendorId: new Types.ObjectId(vendorId),
  })
    .sort({ order: 1, createdAt: -1 })
    .lean<Array<IVendorGalleryItem & { _id: Types.ObjectId }>>();

  return {
    success: true,
    message: "Gallery retrieved successfully.",
    data: {
      vendor: {
        id: vendor._id.toString(),
        companyName: vendor.companyName,
        logo: vendor.logo,
      },
      items: items.map(serializeGalleryItem),
    },
  };
}
