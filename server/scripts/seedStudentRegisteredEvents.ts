import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import EventModel, {
  EventType,
  FundingSource,
  Location,
  IEvent,
} from "../models/Event";
import UserModel, { userRole } from "../models/User";

loadEnv({ path: ".env.local" });
loadEnv();

const mongoUri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/aclDB";

const studentSeed = {
  firstName: "Ahmed",
  lastName: "Kirat",
  email: "ad.kirat@gmail.com",
  password: "Pass@1234",
  studentId: "13001580",
};

type EventSeed = Pick<
  IEvent,
  | "name"
  | "description"
  | "eventType"
  | "date"
  | "location"
  | "capacity"
  | "startDate"
  | "endDate"
  | "registrationDeadline"
  | "fundingSource"
  | "revenue"
  | "archived"
  | "vendors"
>;

const eventSeeds: EventSeed[] = [
  {
    name: "Summer Night Bazaar",
    description: "An evening bazaar with music, food trucks, and artisan booths.",
    eventType: EventType.BAZAAR,
    date: new Date("2024-12-20T17:00:00.000Z"),
    location: Location.GUCCBERLIN,
    capacity: 200,
    startDate: new Date("2024-12-20T17:00:00.000Z"),
    endDate: new Date("2024-12-20T23:00:00.000Z"),
    registrationDeadline: new Date("2025-07-15T23:59:59.000Z"),
    fundingSource: FundingSource.GUC,
    revenue: 0,
    archived: false,
    vendors: ["vendor3"],
  },
];

async function upsertEvent(seed: EventSeed) {
  let event = await EventModel.findOne({ name: seed.name });

  if (!event) {
    event = new EventModel({
      ...seed,
      registeredUsers: [],
    });
  } else {
    event.set({
      description: seed.description,
      eventType: seed.eventType,
      date: seed.date,
      location: seed.location,
      capacity: seed.capacity,
      startDate: seed.startDate,
      endDate: seed.endDate,
      registrationDeadline: seed.registrationDeadline,
      fundingSource: seed.fundingSource,
      revenue: seed.revenue,
      archived: seed.archived,
      vendors: seed.vendors,
    });
    if (!Array.isArray(event.registeredUsers)) {
      event.registeredUsers = [];
    }
  }

  await event.save();
  return event;
}

async function upsertStudent(eventIds: string[]) {
  const email = studentSeed.email.toLowerCase();
  let student = await UserModel.findOne({ email });

  if (!student) {
    student = new UserModel({
      firstName: studentSeed.firstName,
      lastName: studentSeed.lastName,
      email,
      password: studentSeed.password,
      role: userRole.STUDENT,
      studentId: studentSeed.studentId,
      verified: true,
      registeredEvents: eventIds,
    });
  } else {
    student.set({
      firstName: studentSeed.firstName,
      lastName: studentSeed.lastName,
      role: userRole.STUDENT,
      studentId: student.studentId ?? studentSeed.studentId,
      verified: true,
    });
    if (!Array.isArray(student.registeredEvents)) {
      student.registeredEvents = [];
    }
    eventIds.forEach((id) => {
      if (!student!.registeredEvents!.includes(id)) {
        student!.registeredEvents!.push(id);
      }
    });
  }

  await student.save();
  return student;
}

async function linkStudentToEvents(studentId: string, eventIds: string[]) {
  for (const id of eventIds) {
    const event = await EventModel.findById(id);
    if (!event) continue;
    if (!Array.isArray(event.registeredUsers)) {
      event.registeredUsers = [];
    }
    if (!event.registeredUsers.includes(studentId)) {
      event.registeredUsers.push(studentId);
      await event.save();
    }
  }
}

async function main() {
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB at ${mongoUri}`);

    const events = [];
    for (const seed of eventSeeds) {
      const event = await upsertEvent(seed);
      events.push(event);
      console.log(`Event ready: ${event.name} (${event._id.toString()})`);
    }

    const eventIds = events.map((event) => event._id.toString());
    const student = await upsertStudent(eventIds);
    console.log(`Student ready: ${student.email} (${student._id.toString()})`);

    await linkStudentToEvents(student._id.toString(), eventIds);
    console.log("Linked student to registeredUsers array for each event.");

    console.log("\nSeeded student credentials:");
    console.log(`  Email:    ${studentSeed.email}`);
    console.log(`  Password: ${studentSeed.password}`);
  } catch (error) {
    console.error("Seeder error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
