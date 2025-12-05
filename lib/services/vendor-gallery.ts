import { apiFetch } from "@/lib/api-client";

// ============ Types ============

export enum MediaType {
  VIDEO = "video",
  IMAGE = "image",
}

export enum GalleryItemCategory {
  PRODUCT = "product",
  BOOTH = "booth",
  EVENT = "event",
  OTHER = "other",
}

export interface VendorGalleryItem {
  id: string;
  vendorId: string;
  title: string;
  description?: string;
  filePath: string;
  mediaType: MediaType;
  category: GalleryItemCategory;
  eventId?: string;
  eventName?: string;
  thumbnailPath?: string;
  fileSize: number;
  order: number;
  createdAt: string;
}

export interface VendorGalleryResponse {
  success: boolean;
  data?: VendorGalleryItem[];
  message?: string;
}

export interface VendorGalleryItemResponse {
  success: boolean;
  data?: VendorGalleryItem;
  message?: string;
}

// ============ API Functions ============

export async function getMyVendorGallery(
  token: string
): Promise<VendorGalleryResponse> {
  return apiFetch<VendorGalleryResponse>("/vendor-gallery", { token });
}

export async function getPublicVendorGallery(
  vendorId: string,
  category?: GalleryItemCategory
): Promise<VendorGalleryResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const query = params.toString();
  return apiFetch<VendorGalleryResponse>(
    `/vendor-gallery/public/${vendorId}${query ? `?${query}` : ""}`
  );
}

export async function addVendorGalleryItem(
  file: File,
  data: {
    title?: string;
    description?: string;
    category?: GalleryItemCategory;
    eventId?: string;
  },
  token: string
): Promise<VendorGalleryItemResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.category) formData.append("category", data.category);
  if (data.eventId) formData.append("eventId", data.eventId);

  return apiFetch<VendorGalleryItemResponse>("/vendor-gallery", {
    method: "POST",
    body: formData as unknown as Record<string, unknown>,
    skipJson: false,
    token,
  });
}

export async function updateVendorGalleryItem(
  itemId: string,
  data: {
    title?: string;
    description?: string;
    category?: GalleryItemCategory;
    eventId?: string;
  },
  token: string
): Promise<VendorGalleryItemResponse> {
  return apiFetch<VendorGalleryItemResponse>(`/vendor-gallery/${itemId}`, {
    method: "PUT",
    body: data,
    token,
  });
}

export async function deleteVendorGalleryItem(
  itemId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/vendor-gallery/${itemId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function reorderVendorGallery(
  items: Array<{ id: string; order: number }>,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    "/vendor-gallery/reorder",
    {
      method: "PUT",
      body: { items },
      token,
    }
  );
}
