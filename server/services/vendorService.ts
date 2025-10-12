import vendorModel, { VendorStatus } from "../models/Vendor";

export async function updateVendorStatus(vendorId: string, status: VendorStatus) {
  try {
    const vendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      { status },
      { new: true }
    );
    if (!vendor) {
      return { success: false, message: "Vendor not found." };
    }
    return { success: true, data: vendor };
  } catch (error) {
    console.error("Error updating vendor status:", error);
    return { success: false, message: "Error updating vendor status." };
  }
}