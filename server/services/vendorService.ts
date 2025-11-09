import vendorModel, {
  IVendor,
  VendorStatus,
  BoothInfo,
  BazaarApplication,
  VendorAttendee,
  ApplicationPayment,
  PaymentStatus,
  VisitorQrCode,
} from "../models/Vendor";
import { z } from "zod";
import EventModel, {
  BazaarBoothSize,
  EventType,
  Location,
  IEvent,
} from "../models/Event";
import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import { emailService } from "./emailService";
import crypto from "node:crypto";

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
    .optional(),
});

export type vendorSignupData = z.infer<typeof vendorSignupSchema>;

export async function findAll() {
  return vendorModel.find().lean();
}

type VendorDocument = HydratedDocument<IVendor>;

type BazaarApplicationSubdoc = BazaarApplication & {
  eventId: Types.ObjectId;
  attendees: VendorAttendee[];
};

function getVendorApplicationsArray(
  vendor: VendorDocument
): BazaarApplicationSubdoc[] {
  return (vendor.applications ?? []) as unknown as BazaarApplicationSubdoc[];
}

const BAZAAR_FEE_TABLE: Record<Location, Record<BazaarBoothSize, number>> = {
  [Location.GUCCAIRO]: {
    [BazaarBoothSize.SMALL]: 2500,
    [BazaarBoothSize.LARGE]: 3800,
  },
  [Location.GUCCBERLIN]: {
    [BazaarBoothSize.SMALL]: 2200,
    [BazaarBoothSize.LARGE]: 3400,
  },
};

const BOOTH_HOURLY_RATES: Record<Location, number> = {
  [Location.GUCCAIRO]: 320,
  [Location.GUCCBERLIN]: 280,
};

const PAYMENT_CURRENCY = "EGP";

function generateReceiptNumber(): string {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `ZPV-${timestamp}-${random}`;
}

function buildQrCodeUrl(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const encoded = encodeURIComponent(payload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}`;
}

function hoursBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(diffMs / (1000 * 60 * 60), 0);
}

function calculateBazaarFee(
  event: Pick<IEvent, "location">,
  boothSize: BazaarBoothSize
): number {
  const byLocation = BAZAAR_FEE_TABLE[event.location];
  if (!byLocation) {
    return 3000;
  }
  return byLocation[boothSize] ?? 3000;
}

function calculateBoothFee(
  event: Pick<IEvent, "location">,
  boothInfo?: BoothInfo
): number {
  if (!boothInfo?.boothStartTime || !boothInfo?.boothEndTime) {
    return calculateBazaarFee(event, BazaarBoothSize.SMALL);
  }

  const rate = BOOTH_HOURLY_RATES[event.location] ?? 300;
  const hours = hoursBetween(
    new Date(boothInfo.boothStartTime),
    new Date(boothInfo.boothEndTime)
  );

  return Math.max(Math.round(hours * rate), rate);
}

function buildPaymentRecord(
  event: IEvent,
  application: BazaarApplication
): ApplicationPayment {
  const baseAmount = calculateBazaarFee(event, application.boothSize);
  const boothAdjustment = calculateBoothFee(event, application.boothInfo);
  const amount = Math.max(baseAmount, boothAdjustment);
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return {
    amount,
    currency: PAYMENT_CURRENCY,
    status: "pending",
    dueDate,
  };
}

export interface AdminVendorApplication {
  eventId: string;
  eventName?: string;
  status: VendorStatus;
  applicationDate?: Date;
  attendees: number;
  boothSize: BazaarBoothSize;
  boothLocation?: string;
  boothStartTime?: Date;
  boothEndTime?: Date;
}

export interface AdminVendorResponse {
  id: string;
  email: string;
  companyName: string;
  verified: boolean;
  verificationStatus: VendorStatus;
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
    attendees: VendorAttendee[];
    boothSize: BazaarBoothSize;
    boothInfo?: {
      boothLocation?: string;
      boothStartTime?: Date;
      boothEndTime?: Date;
    };
  }
) {
  try {
    console.log("=== applyToBazaar Service Called ===");
    console.log("vendorId:", vendorId);
    console.log("applicationData:", JSON.stringify(applicationData, null, 2));

    // Validate event exists and is a bazaar
    if (!Types.ObjectId.isValid(applicationData.eventId)) {
      console.log("Invalid eventId format");
      return { success: false, message: "Invalid eventId" };
    }
    const event = await EventModel.findById(applicationData.eventId);
    if (!event) {
      console.log("Event not found in database");
      return { success: false, message: "Event not found" };
    }
    console.log("Event found:", event.name, "Type:", event.eventType);

    if (event.eventType !== EventType.BAZAAR) {
      console.log("Event is not a bazaar, type:", event.eventType);
      return { success: false, message: "Event is not a bazaar" };
    }

    // Validate attendees count (1..5)
    if (
      !Array.isArray(applicationData.attendees) ||
      applicationData.attendees.length < 1
    ) {
      console.log("Invalid attendees array:", applicationData.attendees);
      return { success: false, message: "At least 1 attendee is required" };
    }
    // Validate attendees count (max 5)
    if (applicationData.attendees.length > 5) {
      return { success: false, message: "Maximum 5 attendees allowed" };
    }

    const invalidAttendee = applicationData.attendees.find((attendee) => {
      if (!attendee || typeof attendee !== "object") {
        return true;
      }
      const { name, email, idDocumentPath } = attendee;
      if (!name || !email) {
        return true;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        return true;
      }
      return !idDocumentPath;
    });

    if (invalidAttendee) {
      return {
        success: false,
        message:
          "Each attendee must include a valid name, email, and uploaded ID document.",
      };
    }

    const seenEmails = new Set<string>();
    for (const attendee of applicationData.attendees) {
      const email = attendee.email.toLowerCase();
      if (seenEmails.has(email)) {
        return {
          success: false,
          message: "Duplicate attendee email addresses are not allowed.",
        };
      }
      seenEmails.add(email);
    }
    // Validate booth size
    if (!Object.values(BazaarBoothSize).includes(applicationData.boothSize)) {
      return { success: false, message: "Invalid boothSize" };
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

    console.log(
      "Prepared application:",
      JSON.stringify(newApplication, null, 2)
    );

    // Atomically insert only if no existing application for this event
    console.log("Attempting to save application to vendor:", vendorId);
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
      console.log("Failed to update vendor - checking if vendor exists");
      const exists = await vendorModel.exists({ _id: vendorId });
      if (!exists) {
        console.log("Vendor not found:", vendorId);
        return { success: false, message: "Vendor not found" };
      }
      console.log("Vendor exists but already applied for this bazaar");
      return { success: false, message: "Already applied for this bazaar" };
    }

    console.log("Application saved successfully!");

    // Update event capacity - decrease available spots
    const numAttendees = applicationData.attendees.length;
    await EventModel.findByIdAndUpdate(applicationData.eventId, {
      $inc: { capacity: -numAttendees },
    });
    console.log(`Decreased event capacity by ${numAttendees} attendees`);

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

export async function getVendorApplications(vendorId: string) {
  try {
    const vendor = await vendorModel
      .findById(vendorId)
      .select("applications")
      .lean<IVendor>();

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    // Get event details for each application
    const applicationsWithEvents = await Promise.all(
      (vendor.applications || []).map(async (app) => {
        const event = await EventModel.findById(app.eventId).lean<{
          name: string;
          date?: Date;
          location?: string;
          eventType?: EventType;
        }>();
        const resolvedPaymentStatus = resolvePaymentStatus(app.payment);
        return {
          eventId: app.eventId.toString(),
          eventName: event?.name || "Unknown Event",
          eventDate: event?.date,
          eventLocation: event?.location,
          eventType: event?.eventType,
          applicationDate: app.applicationDate,
          status: app.status,
          attendees: app.attendees.length,
          attendeeDetails: app.attendees,
          boothSize: app.boothSize,
          boothLocation: app.boothInfo?.boothLocation,
          boothStartTime: app.boothInfo?.boothStartTime,
          boothEndTime: app.boothInfo?.boothEndTime,
          payment: app.payment
            ? {
                amount: app.payment.amount,
                currency: app.payment.currency,
                status: resolvedPaymentStatus,
                dueDate: app.payment.dueDate,
                paidAt: app.payment.paidAt,
                receiptNumber: app.payment.receiptNumber,
                transactionReference: app.payment.transactionReference,
              }
            : undefined,
          qrCodes: app.qrCodes ?? [],
        };
      })
    );

    return {
      success: true,
      message: "Applications retrieved successfully",
      data: applicationsWithEvents,
    };
  } catch (error) {
    console.error("Error getting vendor applications:", error);
    return {
      success: false,
      message: "An error occurred while retrieving applications",
    };
  }
}

function resolvePaymentStatus(payment?: ApplicationPayment): PaymentStatus | undefined {
  if (!payment) {
    return undefined;
  }

  if (payment.status === "paid") {
    return "paid";
  }

  if (payment.dueDate && payment.dueDate.getTime() < Date.now()) {
    return "overdue";
  }

  return "pending";
}

export async function updateBazaarApplicationStatus(options: {
  vendorId: string;
  eventId: string;
  status: VendorStatus;
  reason?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { vendorId, eventId, status, reason } = options;

    if (!Types.ObjectId.isValid(vendorId) || !Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        message: "Invalid vendor or event identifier provided.",
      };
    }

    const [vendor, event] = await Promise.all([
      vendorModel.findById(vendorId),
      EventModel.findById(eventId),
    ]);

    if (!vendor) {
      return { success: false, message: "Vendor not found" };
    }

    if (!event) {
      return { success: false, message: "Event not found" };
    }

    const application = getVendorApplicationsArray(vendor).find(
      (app) => app.eventId.toString() === eventId
    );

    if (!application) {
      return { success: false, message: "Application not found" };
    }

    application.status = status;
    application.decisionDate = new Date();

    if (status === VendorStatus.APPROVED) {
      application.payment = buildPaymentRecord(event, application);
      await EventModel.findByIdAndUpdate(eventId, {
        $addToSet: { vendors: vendorId },
      });
    } else {
      application.payment = undefined;
      application.qrCodes = [];
      await EventModel.findByIdAndUpdate(eventId, {
        $pull: { vendors: vendorId },
      });
    }

    vendor.markModified("applications");
    await vendor.save();

    await emailService.sendVendorApplicationDecisionEmail({
      vendorEmail: vendor.email,
      vendorCompany: vendor.companyName,
      eventName: event.name,
      status,
      payment: application.payment,
      dueDate: application.payment?.dueDate,
      reason,
    });

    return {
      success: true,
      message: `Application status updated to '${status}'.`,
    };
  } catch (error) {
    console.error("Error updating application status:", error);
    return {
      success: false,
      message: "Failed to update application status",
    };
  }
}

export async function recordVendorPayment(options: {
  vendorId: string;
  eventId: string;
  amountPaid: number;
  transactionReference?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { vendorId, eventId, amountPaid, transactionReference } = options;

    if (!Types.ObjectId.isValid(vendorId) || !Types.ObjectId.isValid(eventId)) {
      return {
        success: false,
        message: "Invalid vendor or event identifier provided.",
      };
    }

    const [vendor, event] = await Promise.all([
      vendorModel.findById(vendorId),
      EventModel.findById(eventId),
    ]);

    if (!vendor) {
      return { success: false, message: "Vendor not found" };
    }

    if (!event) {
      return { success: false, message: "Event not found" };
    }

    const application = getVendorApplicationsArray(vendor).find(
      (app) => app.eventId.toString() === eventId
    );

    if (!application) {
      return { success: false, message: "Application not found" };
    }

    if (application.status !== VendorStatus.APPROVED) {
      return {
        success: false,
        message: "Payment is only allowed for approved applications.",
      };
    }

    if (!application.payment) {
      application.payment = buildPaymentRecord(event, application);
    }

    if (application.payment.status === "paid") {
      return {
        success: false,
        message: "Payment has already been recorded for this application.",
      };
    }

    if (amountPaid < application.payment.amount) {
      return {
        success: false,
        message: "Amount paid is less than the required participation fee.",
      };
    }

    const receiptNumber = generateReceiptNumber();
    const paidAt = new Date();

    application.payment.status = "paid";
    application.payment.paidAt = paidAt;
    application.payment.receiptNumber = receiptNumber;
    if (transactionReference) {
      application.payment.transactionReference = transactionReference;
    }

    const attendeeList = (application.attendees ?? []) as VendorAttendee[];
    const qrCodes: VisitorQrCode[] = attendeeList.map((attendee) => ({
      visitorEmail: attendee.email,
      qrCodeUrl: buildQrCodeUrl({
        eventId,
        vendorId,
        email: attendee.email,
        timestamp: paidAt.toISOString(),
      }),
      issuedAt: paidAt,
    }));

    application.qrCodes = qrCodes;

    vendor.markModified("applications");
    await vendor.save();

    await Promise.all([
      emailService.sendVendorPaymentReceipt({
        vendorEmail: vendor.email,
        vendorCompany: vendor.companyName,
        eventName: event.name,
        amount: application.payment.amount,
        currency: application.payment.currency,
        receiptNumber,
        paidAt,
        dueDate: application.payment.dueDate,
        transactionReference,
      }),
      emailService.sendVendorVisitorQrCodes({
        vendorEmail: vendor.email,
        vendorCompany: vendor.companyName,
        eventName: event.name,
        eventStart: event.startDate,
        qrCodes,
      }),
    ]);

    return {
      success: true,
      message: "Payment recorded successfully and receipt emailed.",
    };
  } catch (error) {
    console.error("Error recording vendor payment:", error);
    return {
      success: false,
      message: "Failed to record payment",
    };
  }
}

export async function updateApplicationAttendees(options: {
  vendorId: string;
  eventId: string;
  attendees: VendorAttendee[];
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { vendorId, eventId, attendees } = options;

    if (!Array.isArray(attendees) || attendees.length === 0) {
      return {
        success: false,
        message: "At least one attendee is required.",
      };
    }

    if (attendees.length > 5) {
      return {
        success: false,
        message: "Maximum of 5 attendees is allowed per application.",
      };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();

    for (const attendee of attendees) {
      if (!attendee.name || !attendee.email || !attendee.idDocumentPath) {
        return {
          success: false,
          message:
            "Each attendee must include a name, email, and uploaded ID document.",
        };
      }
      if (!emailPattern.test(attendee.email)) {
        return {
          success: false,
          message: `Invalid attendee email: ${attendee.email}`,
        };
      }
      const normalized = attendee.email.toLowerCase();
      if (seenEmails.has(normalized)) {
        return {
          success: false,
          message: "Duplicate attendee email addresses are not allowed.",
        };
      }
      seenEmails.add(normalized);
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    const application = getVendorApplicationsArray(vendor).find(
      (app) => app.eventId.toString() === eventId
    );

    if (!application) {
      return {
        success: false,
        message: "Application not found",
      };
    }

    application.attendees = attendees;

    const event = await EventModel.findById(eventId);

    if (!event) {
      return {
        success: false,
        message: "Event not found",
      };
    }

    if (application.payment?.status === "paid") {
      const issuedAt = new Date();
      const qrCodes: VisitorQrCode[] = attendees.map((attendee) => ({
        visitorEmail: attendee.email,
        qrCodeUrl: buildQrCodeUrl({
          eventId,
          vendorId,
          email: attendee.email,
          timestamp: issuedAt.toISOString(),
        }),
        issuedAt,
      }));
      application.qrCodes = qrCodes;

      await emailService.sendVendorVisitorQrCodes({
        vendorEmail: vendor.email,
        vendorCompany: vendor.companyName,
        eventName: event.name,
        eventStart: event.startDate,
        qrCodes,
      });
    }

    vendor.markModified("applications");
    await vendor.save();

    return {
      success: true,
      message: "Attendee list updated successfully.",
    };
  } catch (error) {
    console.error("Error updating attendees:", error);
    return {
      success: false,
      message: "Failed to update attendees",
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

    const normalized: AdminVendorResponse[] = await Promise.all(
      vendors.map(async (vendor) => {
        // Fetch event names for all applications
        const applicationsWithNames = await Promise.all(
          (vendor.applications ?? []).map(async (application) => {
            const event = await EventModel.findById(application.eventId)
              .select("name")
              .lean<{ name: string }>();

            const resolvedPaymentStatus = resolvePaymentStatus(
              application.payment
            );

            return {
              eventId: application.eventId.toString(),
              eventName: event?.name || "Unknown Event",
              status: application.status,
              applicationDate: application.applicationDate,
              attendees: application.attendees?.length ?? 0,
              boothSize: application.boothSize,
              boothLocation: application.boothInfo?.boothLocation,
              boothStartTime: application.boothInfo?.boothStartTime,
              boothEndTime: application.boothInfo?.boothEndTime,
              payment: application.payment
                ? {
                    amount: application.payment.amount,
                    currency: application.payment.currency,
                    status: resolvedPaymentStatus,
                    dueDate: application.payment.dueDate,
                    paidAt: application.payment.paidAt,
                    receiptNumber: application.payment.receiptNumber,
                    transactionReference:
                      application.payment.transactionReference,
                  }
                : undefined,
              qrCodes: application.qrCodes ?? [],
            };
          })
        );

        const pendingApplications = applicationsWithNames.filter(
          (app) => app.status === VendorStatus.PENDING
        ).length;
        const approvedApplications = applicationsWithNames.filter(
          (app) => app.status === VendorStatus.APPROVED
        ).length;
        const rejectedApplications = applicationsWithNames.filter(
          (app) => app.status === VendorStatus.REJECTED
        ).length;

        return {
          id: vendor._id.toString(),
          email: vendor.email,
          companyName: vendor.companyName,
          verified: vendor.verified ?? false,
          verificationStatus: vendor.verificationStatus ?? VendorStatus.PENDING,
          loyaltyForum: vendor.loyaltyForum || undefined,
          logo: vendor.logo || undefined,
          taxCard: vendor.taxCard || undefined,
          documents: vendor.documents || undefined,
          applications: applicationsWithNames,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        };
      })
    );

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

export async function approveVendorAccount(vendorId: string) {
  try {
    const vendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      {
        verified: true,
        verificationStatus: VendorStatus.APPROVED,
      },
      { new: true }
    );

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    return {
      success: true,
      message: "Vendor account approved successfully",
    };
  } catch (error) {
    console.error("Error approving vendor account:", error);
    return {
      success: false,
      message: "Failed to approve vendor account",
    };
  }
}

export async function rejectVendorAccount(vendorId: string) {
  try {
    const vendor = await vendorModel.findByIdAndUpdate(
      vendorId,
      {
        verified: false,
        verificationStatus: VendorStatus.REJECTED,
      },
      { new: true }
    );

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    return {
      success: true,
      message: "Vendor account rejected",
    };
  } catch (error) {
    console.error("Error rejecting vendor account:", error);
    return {
      success: false,
      message: "Failed to reject vendor account",
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

// Get vendor profile by ID
export async function getVendorProfile(vendorId: string): Promise<{
  success: boolean;
  message?: string;
  data?: Partial<IVendor>;
}> {
  try {
    const vendor = await vendorModel.findById(vendorId).select("-password");

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    return {
      success: true,
      data: {
        id: vendor._id.toString(),
        email: vendor.email,
        companyName: vendor.companyName,
        loyaltyForum: vendor.loyaltyForum,
        logo: vendor.logo,
        taxCard: vendor.taxCard,
        documents: vendor.documents,
        isVerified: vendor.isVerified,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error fetching vendor profile:", error);
    return {
      success: false,
      message: "An error occurred while fetching vendor profile",
    };
  }
}

// Update vendor profile
export async function updateVendorProfile(
  vendorId: string,
  updateData: Partial<IVendor>
): Promise<{
  success: boolean;
  message?: string;
  data?: Partial<IVendor>;
}> {
  try {
    const allowedUpdates = [
      "companyName",
      "loyaltyForum",
      "logo",
      "taxCard",
      "documents",
    ];
    const updates: Partial<IVendor> = {};

    // Only allow specific fields to be updated
    for (const key of allowedUpdates) {
      if (key in updateData) {
        updates[key as keyof IVendor] = updateData[
          key as keyof IVendor
        ] as never;
      }
    }

    const vendor = await vendorModel
      .findByIdAndUpdate(
        vendorId,
        { $set: updates },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!vendor) {
      return {
        success: false,
        message: "Vendor not found",
      };
    }

    return {
      success: true,
      message: "Profile updated successfully",
      data: {
        id: vendor._id.toString(),
        email: vendor.email,
        companyName: vendor.companyName,
        loyaltyForum: vendor.loyaltyForum,
        logo: vendor.logo,
        taxCard: vendor.taxCard,
        documents: vendor.documents,
      },
    };
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    return {
      success: false,
      message: "An error occurred while updating profile",
    };
  }
}
