import { Types } from "mongoose";
import EventModel, { EventType } from "../models/Event";
import { sendWorkshopCertificates } from "./eventService";

type WorkshopSummary = {
  _id: Types.ObjectId;
  name: string;
  endDate: Date;
  registeredUsers?: string[];
  createdBy?: string | null;
};

const CERTIFICATE_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let schedulerStarted = false;
let schedulerBusy = false;

async function findCompletedWorkshopsNeedingCertificates() {
  const now = new Date();

  const workshops = await EventModel.find({
    eventType: EventType.WORKSHOP,
    archived: { $ne: true },
    endDate: { $lte: now },
    $and: [
      {
        $or: [
          { certificateSentAt: { $exists: false } },
          { certificateSentCount: { $lt: 1 } },
        ],
      },
      {
        $or: [
          { registeredUsers: { $exists: true, $ne: [] } },
          { createdBy: { $exists: true, $ne: null } },
        ],
      },
    ],
  })
    .select(["_id", "name", "endDate", "registeredUsers", "createdBy"])
    .lean<Array<WorkshopSummary>>();

  return workshops;
}

async function dispatchCertificatesForCompletedWorkshops() {
  const workshops = await findCompletedWorkshopsNeedingCertificates();

  if (!workshops.length) {
    return;
  }

  console.info(
    `[CertificateScheduler] Dispatching certificates for ${workshops.length} workshop(s) at ${new Date().toISOString()}`
  );

  for (const workshop of workshops) {
    try {
      const result = await sendWorkshopCertificates(workshop._id.toString(), {
        source: "auto",
      });

      if (!result.success) {
        console.warn(
          `[CertificateScheduler] ${workshop._id.toString()}: ${result.message}`
        );
      }
    } catch (error) {
      console.error(
        `[CertificateScheduler] Failed to send certificates for workshop ${workshop._id.toString()}:`,
        error
      );
    }
  }
}

export function startCertificateScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  const tick = async () => {
    if (schedulerBusy) {
      return;
    }

    schedulerBusy = true;
    try {
      await dispatchCertificatesForCompletedWorkshops();
    } catch (error) {
      console.error("Certificate scheduler tick error:", error);
    } finally {
      schedulerBusy = false;
    }
  };

  void tick();

  setInterval(() => {
    void tick();
  }, CERTIFICATE_CHECK_INTERVAL_MS);
}
