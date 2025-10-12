import vendorModel, { IVendor, VendorStatus } from "../models/Vendor";  
import { z } from "zod";
import EventModel, { EventType } from "../models/Event";


// Zod schema for vendor signup validation
export const vendorSignupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(20, { message: 'Password must be at most 20 characters long' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' })
    .trim(),
  companyName: z.string()
    .min(2, { message: 'Company name must be at least 2 characters long.' })
    .max(50, { message: 'Company name must be at most 50 characters long.' })
    .trim(),
});

export type vendorSignupData = z.infer<typeof vendorSignupSchema>;

export async function findAll() {
  return vendorModel.find().lean();
}

export async function create(data: Partial<IVendor>) {
  const doc = new vendorModel(data);
  return doc.save();
}

// Vendor signup service function
export async function signup(vendorData: vendorSignupData) {
  // Validate with Zod
  const validatedData = vendorSignupSchema.parse(vendorData);
  
  // Create vendor with default values for required fields
  const vendorDataWithDefaults = {
    ...validatedData,
    phoneNumber: "",
    contactPersonName: "",
    documents: "", // Fixed: use correct field name
    logo: "",
    taxCard: "",
    loyaltyForum: ""
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
  }
) {
  try {
    // Validate event exists and is a bazaar
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

    // Prepare application payload
    const newApplication = {
      eventId: applicationData.eventId,
      status: VendorStatus.PENDING,
      applicationDate: new Date(),
      attendees: applicationData.attendees,
      boothSize: applicationData.boothSize,
    };

    // Atomically insert only if no existing application for this event
    const updatedVendor = await VendorModel.findOneAndUpdate(
      {
        _id: vendorId,
        "applications.eventId": { $ne: applicationData.eventId },
      },
      { $push: { applications: newApplication } },
      {
        new: true,
        runValidators: true,
        projection: { applications: { $slice: -1 } }, // return only the inserted subdoc
      }
    );

    if (!updatedVendor) {
      const exists = await VendorModel.exists({ _id: vendorId });
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
  } catch (error: unknown) {
    // Surface validation errors clearly
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ValidationError"
    ) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Validation failed",
      };
    }
    console.error("Error applying to bazaar:", error);
    return {
      success: false,
      message: "An error occurred while submitting application",
    };
  }
}
