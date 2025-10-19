import vendorModel, {
  IVendor,
  VendorStatus,
  BoothInfo,
  BazaarApplication,
} from "../models/Vendor";
import { z } from "zod";
import EventModel, { EventType } from "../models/Event";
import { Types } from "mongoose";

// Zod schema for vendor signup validation
export const vendorSignupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password must be at most 20 characters long" })
    .regex(/[a-zA-Z]/, {
      message: "Password must contain at least one letter.",
    })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Password must contain at least one special character.",
    })
    .trim(),
  companyName: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters long." })
    .max(50, { message: "Company name must be at most 50 characters long." })
    .trim(),
  loyaltyForum: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .or(z.literal(""))
    .optional(),
});

export type vendorSignupData = z.infer<typeof vendorSignupSchema>;

export async function findAll() {
  return vendorModel.find().lean();
}

export interface AdminVendorApplication {
  eventId: string;
  status: VendorStatus;
  applicationDate?: Date;
  attendees: number;
  boothSize: number;
  boothLocation?: string;
  boothStartTime?: Date;
  boothEndTime?: Date;
}

export interface AdminVendorResponse {
  id: string;
  email: string;
  companyName: string;
  loyaltyForum?: string;
  logo?: string;
  taxCard?: string;
  documents?: string;
  applications: AdminVendorApplication[];
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function create(data: Partial<IVendor>) {
  const doc = new vendorModel(data);
  return doc.save();
}

// Vendor signup service function
export async function signup(vendorData: vendorSignupData) {
  // Validate with Zod
  const validatedData = vendorSignupSchema.parse(vendorData);

  const email = validatedData.email.toLowerCase();

  // Create vendor with default values for required fields
  const vendorDataWithDefaults = {
    ...validatedData,
    email,
    documents: "", // Fixed: use correct field name
    logo: "",
    taxCard: "",
    loyaltyForum: validatedData.loyaltyForum ?? "",
  };

  const vendor = new vendorModel(vendorDataWithDefaults);
  await vendor.save();

  // Return vendor without password
  const vendorWithoutPassword = vendor.toObject();
  delete (vendorWithoutPassword as Partial<IVendor>).password;
  return vendorWithoutPassword;
}

export async function applyToBazaar(
  vendorId: string,
  applicationData: {
    eventId: string;
    attendees: { name: string; email: string }[];
    boothSize: number;
    boothInfo?: {
      boothLocation?: string;
      boothStartTime?: Date;
      boothEndTime?: Date;
    };
  }
) {
  try {
    // Validate event exists and is a bazaar
    if (!Types.ObjectId.isValid(applicationData.eventId)) {
      return { success: false, message: "Invalid eventId" };
    }
    const event = await EventModel.findById(applicationData.eventId);
    if (!event) {
      return { success: false, message: "Event not found" };
    }
    if (event.eventType !== EventType.BAZAAR) {
      return { success: false, message: "Event is not a bazaar" };
    }

    // Validate attendees count (1..5)
    if (
      !Array.isArray(applicationData.attendees) ||
      applicationData.attendees.length < 1
    ) {
      return { success: false, message: "At least 1 attendee is required" };
    }
    // Validate attendees count (max 5)
    if (applicationData.attendees.length > 5) {
      return { success: false, message: "Maximum 5 attendees allowed" };
    }
    // Validate booth size
    if (
      !Number.isFinite(applicationData.boothSize) ||
      applicationData.boothSize < 1
    ) {
      return { success: false, message: "boothSize must be a number >= 1" };
    }

    let boothInfoToSave: BoothInfo | undefined = undefined;
    if (applicationData.boothInfo) {
      const { boothStartTime, boothEndTime, boothLocation } =
        applicationData.boothInfo;

      if (
        (boothStartTime && !boothEndTime) ||
        (!boothStartTime && boothEndTime)
      ) {
        return {
          success: false,
          message:
            "Both boothStartTime and boothEndTime are required when providing booth schedule",
        };
      }

      if (boothStartTime && boothEndTime) {
        const start = new Date(boothStartTime);
        const end = new Date(boothEndTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return {
            success: false,
            message: "Invalid boothStartTime or boothEndTime",
          };
        }
        if (end <= start) {
          return {
            success: false,
            message: "boothEndTime must be after boothStartTime",
          };
        }
        // Ensure booth times fall within the event duration (optional but recommended)
        if (event.startDate && event.endDate) {
          if (start < event.startDate || end > event.endDate) {
            return {
              success: false,
              message: "Booth times must be within the event start/end dates",
            };
          }
        }
        boothInfoToSave = {
          boothLocation: boothLocation || undefined,
          boothStartTime: start,
          boothEndTime: end,
        };
      }
    }

    // Prepare application payload
    const newApplication: BazaarApplication = {
      eventId: new Types.ObjectId(applicationData.eventId),
      status: VendorStatus.PENDING,
      applicationDate: new Date(),
      attendees: applicationData.attendees,
      boothSize: applicationData.boothSize,
      ...(boothInfoToSave ? { boothInfo: boothInfoToSave } : {}),
    };

    // Atomically insert only if no existing application for this event
    const updatedVendor = await vendorModel.findOneAndUpdate(
      {
        _id: vendorId,
        "applications.eventId": {
          $ne: new Types.ObjectId(applicationData.eventId),
        },
      },
      { $push: { applications: newApplication } },
      {
        new: true,
        runValidators: true,
        projection: { applications: { $slice: -1 } }, // return only the inserted subdoc
      }
    );

    if (!updatedVendor) {
      const exists = await vendorModel.exists({ _id: vendorId });
      if (!exists) {
        return { success: false, message: "Vendor not found" };
      }
      return { success: false, message: "Already applied for this bazaar" };
    }

    const savedApp = updatedVendor.applications[0];
    return {
      success: true,
      message: "Application submitted successfully",
      data: savedApp,
    };
  } catch (error) {
    console.error("Error applying to bazaar:", error);
    return {
      success: false,
      message: "An error occurred while submitting application",
    };
  }
}

export async function findAllForAdmin(): Promise<{
  success: boolean;
  message: string;
  count: number;
  vendors: AdminVendorResponse[];
}> {
  try {
    const vendors = await vendorModel
      .find()
      .lean<Array<IVendor & { _id: Types.ObjectId }>>();

    const normalized: AdminVendorResponse[] = vendors.map((vendor) => {
      const applications = (vendor.applications ?? []).map((application) => ({
        eventId: application.eventId.toString(),
        status: application.status,
        applicationDate: application.applicationDate,
        attendees: application.attendees?.length ?? 0,
        boothSize: application.boothSize,
        boothLocation: application.boothInfo?.boothLocation,
        boothStartTime: application.boothInfo?.boothStartTime,
        boothEndTime: application.boothInfo?.boothEndTime,
      }));

      const pendingApplications = applications.filter(
        (app) => app.status === VendorStatus.PENDING
      ).length;
      const approvedApplications = applications.filter(
        (app) => app.status === VendorStatus.APPROVED
      ).length;
      const rejectedApplications = applications.filter(
        (app) => app.status === VendorStatus.REJECTED
      ).length;

      return {
        id: vendor._id.toString(),
        email: vendor.email,
        companyName: vendor.companyName,
        loyaltyForum: vendor.loyaltyForum || undefined,
        logo: vendor.logo || undefined,
        taxCard: vendor.taxCard || undefined,
        documents: vendor.documents || undefined,
        applications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      };
    });

    return {
      success: true,
      message: normalized.length
        ? "Vendors retrieved successfully"
        : "No vendors found",
      count: normalized.length,
      vendors: normalized,
    };
  } catch (error) {
    console.error("Error retrieving vendors:", error);
    return {
      success: false,
      message: "Failed to retrieve vendors",
      count: 0,
      vendors: [],
    };
  }
}

export async function verifyVendor(vendorId: string): Promise<{
  success: boolean;
  message: string;
  data?: { id: string; companyName: string; isVerified: boolean };
}> {
  try {
    if (!Types.ObjectId.isValid(vendorId)) {
      return {
        success: false,
        message: "Invalid vendor ID format",
      };
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    const updatedVendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      { $set: { isVerified: true } },
      { new: true }
    );

    if (!updatedVendor) {
      return {
        success: false,
        message: "Failed to verify vendor",
      };
    }

    return {
      success: true,
      message: "Vendor verified successfully",
      data: {
        id: updatedVendor._id.toString(),
        companyName: updatedVendor.companyName,
        isVerified: true,
      },
    };
  } catch (error) {
    console.error("Error verifying vendor:", error);
    return {
      success: false,
      message: "An error occurred while verifying the vendor",
    };
  }
}
