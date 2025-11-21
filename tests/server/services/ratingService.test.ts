import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import EventModel, { EventType, IEvent } from "../../../server/models/Event";
import RatingModel from "../../../server/models/Rating";
import UserModel, {
  IUser,
  userRole,
  userStatus,
} from "../../../server/models/User";
import {
  getEventRatings,
  submitRating,
  SubmitRatingInput,
} from "../../../server/services/ratingService";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.ENCRYPTION_SALT_ROUNDS = "4";
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "info").mockImplementation(() => undefined);
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.restoreAllMocks();
});

describe("submitRating", () => {
  let user: IUser & { _id: Types.ObjectId };
  let user2: IUser & { _id: Types.ObjectId };
  let pastEvent: IEvent & { _id: Types.ObjectId };
  let futureEvent: IEvent & { _id: Types.ObjectId };

  beforeEach(async () => {
    const userDoc = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await userDoc.save();
    user = userDoc.toObject() as IUser & { _id: Types.ObjectId };
    user._id = userDoc._id as Types.ObjectId;

    const user2Doc = new UserModel({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU002",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user2Doc.save();
    user2 = user2Doc.toObject() as IUser & { _id: Types.ObjectId };
    user2._id = user2Doc._id as Types.ObjectId;

    // Create a past event (already ended)
    const pastEventDoc = new EventModel({
      name: "Past Workshop",
      description: "Workshop that already happened",
      eventType: EventType.WORKSHOP,
      date: new Date("2025-10-01T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-01T10:00:00Z"),
      endDate: new Date("2025-10-01T12:00:00Z"),
      registrationDeadline: new Date("2025-09-25T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });
    await pastEventDoc.save();
    pastEvent = pastEventDoc.toObject() as IEvent & { _id: Types.ObjectId };
    pastEvent._id = pastEventDoc._id as Types.ObjectId;

    // Create a future event (hasn't started yet)
    const futureEventDoc = new EventModel({
      name: "Future Workshop",
      description: "Workshop in the future",
      eventType: EventType.WORKSHOP,
      date: new Date("2025-12-01T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-12-01T10:00:00Z"),
      endDate: new Date("2025-12-01T12:00:00Z"),
      registrationDeadline: new Date("2025-11-25T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });
    await futureEventDoc.save();
    futureEvent = futureEventDoc.toObject() as IEvent & { _id: Types.ObjectId };
    futureEvent._id = futureEventDoc._id as Types.ObjectId;

    // Update users with registered events
    await UserModel.findByIdAndUpdate(user._id, {
      registeredEvents: [pastEvent._id.toString(), futureEvent._id.toString()],
    });
  });

  it("should reject rating with missing event id", async () => {
    const input: SubmitRatingInput = {
      eventId: "",
      rating: 4,
      comment: "Great event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Event id is required");
  });

  it("should reject rating with invalid event id", async () => {
    const input: SubmitRatingInput = {
      eventId: "invalid-id",
      rating: 4,
      comment: "Great event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid event identifier.");
  });

  it("should reject rating below 0", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: -1,
      comment: "Invalid rating",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Rating must be between 0 and 5");
  });

  it("should reject rating above 5", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 6,
      comment: "Invalid rating",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Rating must be between 0 and 5");
  });

  it("should accept rating of 0", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 0,
      comment: "Terrible event",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.rating).toBe(0);
  });

  it("should accept rating of 5", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 5,
      comment: "Perfect event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.rating).toBe(5);
  });

  it("should accept rating with decimal values", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 3.5,
      comment: "Good event",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.rating).toBe(3.5);
  });

  it("should reject comment exceeding 1000 characters", async () => {
    const longComment = "a".repeat(1001);
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: longComment,
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Comments cannot exceed 1000 characters");
  });

  it("should accept comment with exactly 1000 characters", async () => {
    const maxComment = "a".repeat(1000);
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: maxComment,
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.comment).toBe(maxComment);
  });

  it("should accept rating without comment", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.comment).toBeUndefined();
  });

  it("should trim whitespace from comment", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: "  Great event!  ",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.comment).toBe("Great event!");
  });

  it("should reject rating for non-existent event", async () => {
    const fakeEventId = new Types.ObjectId().toString();
    const input: SubmitRatingInput = {
      eventId: fakeEventId,
      rating: 4,
      comment: "Great event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Event not found.");
  });

  it("should reject rating for event user did not attend", async () => {
    const unattendedEvent = await EventModel.create({
      name: "Unattended Workshop",
      description: "User not registered",
      eventType: EventType.WORKSHOP,
      date: new Date("2025-10-15T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-15T10:00:00Z"),
      endDate: new Date("2025-10-15T12:00:00Z"),
      registrationDeadline: new Date("2025-10-10T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [], // User not registered
    });

    const input: SubmitRatingInput = {
      eventId: unattendedEvent._id.toString(),
      rating: 4,
      comment: "Great event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.message).toBe("You can only rate events you attended.");
  });

  it("should reject rating for future event that hasn't started", async () => {
    const input: SubmitRatingInput = {
      eventId: futureEvent._id.toString(),
      rating: 4,
      comment: "Excited for this event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "Ratings are only available after the event starts."
    );
  });

  it("should successfully submit rating for past event", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4.5,
      comment: "Great workshop, learned a lot!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Rating saved successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.rating).toBe(4.5);
    expect(result.data?.comment).toBe("Great workshop, learned a lot!");
    expect(result.data?.eventId).toBe(pastEvent._id.toString());
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user?.firstName).toBe("John");
    expect(result.data?.user?.lastName).toBe("Doe");
    expect(result.data?.user?.role).toBe(userRole.STUDENT);

    // Verify rating was saved to database
    const savedRating = await RatingModel.findOne({
      user: user._id,
      event: pastEvent._id,
    });
    expect(savedRating).toBeDefined();
    expect(savedRating?.rating).toBe(4.5);
    expect(savedRating?.comment).toBe("Great workshop, learned a lot!");
  });

  it("should update existing rating when user submits again", async () => {
    // First rating
    const input1: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 3,
      comment: "It was okay",
    };
    await submitRating(user._id.toString(), input1);

    // Second rating (update)
    const input2: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 5,
      comment: "Actually, it was amazing!",
    };
    const result = await submitRating(user._id.toString(), input2);

    expect(result.success).toBe(true);
    expect(result.data?.rating).toBe(5);
    expect(result.data?.comment).toBe("Actually, it was amazing!");

    // Verify only one rating exists
    const ratings = await RatingModel.find({
      user: user._id,
      event: pastEvent._id,
    });
    expect(ratings).toHaveLength(1);
    expect(ratings[0].rating).toBe(5);
  });

  it("should allow multiple users to rate the same event", async () => {
    const input1: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: "Great event!",
    };
    await submitRating(user._id.toString(), input1);

    // Update event to include user2
    await EventModel.findByIdAndUpdate(pastEvent._id, {
      $push: { registeredUsers: user2._id.toString() },
    });
    await UserModel.findByIdAndUpdate(user2._id, {
      $push: { registeredEvents: pastEvent._id.toString() },
    });

    const input2: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 3,
      comment: "Good event",
    };
    const result = await submitRating(user2._id.toString(), input2);

    expect(result.success).toBe(true);

    // Verify two separate ratings exist
    const ratings = await RatingModel.find({ event: pastEvent._id });
    expect(ratings).toHaveLength(2);
  });

  it("should handle user registered in event.registeredUsers", async () => {
    const event = await EventModel.create({
      name: "Test Event",
      description: "Test",
      eventType: EventType.SEMINAR,
      date: new Date("2025-10-20T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-20T10:00:00Z"),
      endDate: new Date("2025-10-20T12:00:00Z"),
      registrationDeadline: new Date("2025-10-15T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });

    const input: SubmitRatingInput = {
      eventId: event._id.toString(),
      rating: 4,
      comment: "Good event",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
  });

  it("should handle user registered in user.registeredEvents", async () => {
    const event = await EventModel.create({
      name: "Another Event",
      description: "Test",
      eventType: EventType.SEMINAR,
      date: new Date("2025-10-25T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-25T10:00:00Z"),
      endDate: new Date("2025-10-25T12:00:00Z"),
      registrationDeadline: new Date("2025-10-20T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [],
    });

    await UserModel.findByIdAndUpdate(user._id, {
      $push: { registeredEvents: event._id.toString() },
    });

    const input: SubmitRatingInput = {
      eventId: event._id.toString(),
      rating: 4,
      comment: "Good event",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
  });

  it("should use endDate for event timing when available", async () => {
    const event = await EventModel.create({
      name: "Event with EndDate",
      description: "Test",
      eventType: EventType.WORKSHOP,
      date: new Date("2025-10-01T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-01T10:00:00Z"),
      endDate: new Date("2025-10-01T18:00:00Z"), // Past date
      registrationDeadline: new Date("2025-09-25T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });

    const input: SubmitRatingInput = {
      eventId: event._id.toString(),
      rating: 4,
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
  });

  it("should use startDate when endDate not available", async () => {
    const event = await EventModel.create({
      name: "Event with StartDate only",
      description: "Test",
      eventType: EventType.SEMINAR,
      date: new Date("2025-10-01T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-01T10:00:00Z"), // Past date
      endDate: new Date("2025-10-01T12:00:00Z"),
      registrationDeadline: new Date("2025-09-25T23:59:59Z"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });

    const input: SubmitRatingInput = {
      eventId: event._id.toString(),
      rating: 4,
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
  });

  it("should include createdAt and updatedAt timestamps", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: "Great event!",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.createdAt).toBeDefined();
    expect(result.data?.updatedAt).toBeDefined();
  });

  it("should handle empty comment string", async () => {
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: "",
    };

    const result = await submitRating(user._id.toString(), input);

    expect(result.success).toBe(true);
    expect(result.data?.comment).toBe("");
  });

  it("should handle user not found", async () => {
    const fakeUserId = new Types.ObjectId().toString();
    const input: SubmitRatingInput = {
      eventId: pastEvent._id.toString(),
      rating: 4,
      comment: "Great event!",
    };

    const result = await submitRating(fakeUserId, input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("User not found.");
  });
});

describe("getEventRatings", () => {
  let user1: IUser & { _id: Types.ObjectId };
  let user2: IUser & { _id: Types.ObjectId };
  let user3: IUser & { _id: Types.ObjectId };
  let event: IEvent & { _id: Types.ObjectId };

  beforeEach(async () => {
    const user1Doc = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user1Doc.save();
    user1 = user1Doc.toObject() as IUser & { _id: Types.ObjectId };
    user1._id = user1Doc._id as Types.ObjectId;

    const user2Doc = new UserModel({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@guc.edu.eg",
      password: "password123",
      role: userRole.PROFESSOR,
      staffId: "PROF001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user2Doc.save();
    user2 = user2Doc.toObject() as IUser & { _id: Types.ObjectId };
    user2._id = user2Doc._id as Types.ObjectId;

    const user3Doc = new UserModel({
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob.johnson@guc.edu.eg",
      password: "password123",
      role: userRole.TA,
      staffId: "TA001",
      status: userStatus.ACTIVE,
      verified: true,
    });
    await user3Doc.save();
    user3 = user3Doc.toObject() as IUser & { _id: Types.ObjectId };
    user3._id = user3Doc._id as Types.ObjectId;

    const eventDoc = new EventModel({
      name: "Test Workshop",
      description: "A great workshop",
      eventType: EventType.WORKSHOP,
      date: new Date("2025-10-01T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-01T10:00:00Z"),
      endDate: new Date("2025-10-01T12:00:00Z"),
      registrationDeadline: new Date("2025-09-25T23:59:59Z"),
      fundingSource: "GUC",
    });
    await eventDoc.save();
    event = eventDoc.toObject() as IEvent & { _id: Types.ObjectId };
    event._id = eventDoc._id as Types.ObjectId;
  });

  it("should reject request with invalid event id", async () => {
    const result = await getEventRatings("invalid-id");

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid event identifier.");
  });

  it("should reject request for non-existent event", async () => {
    const fakeEventId = new Types.ObjectId().toString();
    const result = await getEventRatings(fakeEventId);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Event not found.");
  });

  it("should return empty ratings for event with no ratings", async () => {
    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Ratings retrieved successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.event.id).toBe(event._id.toString());
    expect(result.data?.event.name).toBe("Test Workshop");
    expect(result.data?.averageRating).toBe(0);
    expect(result.data?.totalRatings).toBe(0);
    expect(result.data?.ratings).toEqual([]);
  });

  it("should return single rating correctly", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4.5,
      comment: "Great workshop!",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.totalRatings).toBe(1);
    expect(result.data?.averageRating).toBe(4.5);
    expect(result.data?.ratings).toHaveLength(1);
    expect(result.data?.ratings[0].rating).toBe(4.5);
    expect(result.data?.ratings[0].comment).toBe("Great workshop!");
  });

  it("should calculate average rating correctly with multiple ratings", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 5,
      comment: "Excellent!",
    });

    await RatingModel.create({
      user: user2._id,
      event: event._id,
      rating: 3,
      comment: "Good",
    });

    await RatingModel.create({
      user: user3._id,
      event: event._id,
      rating: 4,
      comment: "Nice",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.totalRatings).toBe(3);
    expect(result.data?.averageRating).toBe(4); // (5 + 3 + 4) / 3 = 4
    expect(result.data?.ratings).toHaveLength(3);
  });

  it("should round average rating to 2 decimal places", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4.7,
    });

    await RatingModel.create({
      user: user2._id,
      event: event._id,
      rating: 3.2,
    });

    await RatingModel.create({
      user: user3._id,
      event: event._id,
      rating: 4.8,
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    // (4.7 + 3.2 + 4.8) / 3 = 4.233333... -> 4.23
    expect(result.data?.averageRating).toBe(4.23);
  });

  it("should sort ratings by creation date descending", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 5,
      comment: "First rating",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await RatingModel.create({
      user: user2._id,
      event: event._id,
      rating: 4,
      comment: "Second rating",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await RatingModel.create({
      user: user3._id,
      event: event._id,
      rating: 3,
      comment: "Third rating",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.ratings).toHaveLength(3);
    // Should be in reverse chronological order (newest first)
    expect(result.data?.ratings[0].comment).toBe("Third rating");
    expect(result.data?.ratings[1].comment).toBe("Second rating");
    expect(result.data?.ratings[2].comment).toBe("First rating");
  });

  it("should include user information in ratings", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4.5,
      comment: "Great!",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.ratings[0].user).toBeDefined();
    expect(result.data?.ratings[0].user?.firstName).toBe("John");
    expect(result.data?.ratings[0].user?.lastName).toBe("Doe");
    expect(result.data?.ratings[0].user?.role).toBe(userRole.STUDENT);
    expect(result.data?.ratings[0].user?.id).toBe(user1._id.toString());
  });

  it("should include event information in response", async () => {
    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.event).toMatchObject({
      id: event._id.toString(),
      name: "Test Workshop",
      startDate: new Date("2025-10-01T10:00:00Z"),
      endDate: new Date("2025-10-01T12:00:00Z"),
    });
  });

  it("should handle ratings without comments", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4,
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.ratings[0].comment).toBeUndefined();
  });

  it("should handle ratings with empty comments", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4,
      comment: "",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.ratings[0].comment).toBe("");
  });

  it("should include rating id in response", async () => {
    const rating = await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4.5,
      comment: "Great!",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.ratings[0].id).toBe(rating._id.toString());
  });

  it("should include timestamps in ratings", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4.5,
      comment: "Great!",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.ratings[0].createdAt).toBeDefined();
    expect(result.data?.ratings[0].updatedAt).toBeDefined();
  });

  it("should handle ratings with 0 rating", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 0,
      comment: "Terrible",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.averageRating).toBe(0);
    expect(result.data?.ratings[0].rating).toBe(0);
  });

  it("should handle ratings with 5 rating", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 5,
      comment: "Perfect!",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.averageRating).toBe(5);
    expect(result.data?.ratings[0].rating).toBe(5);
  });

  it("should only return ratings for specified event", async () => {
    const otherEvent = await EventModel.create({
      name: "Other Event",
      description: "Different event",
      eventType: EventType.SEMINAR,
      date: new Date("2025-10-15T10:00:00Z"),
      location: "GUC Cairo",
      startDate: new Date("2025-10-15T10:00:00Z"),
      endDate: new Date("2025-10-15T12:00:00Z"),
      registrationDeadline: new Date("2025-10-10T23:59:59Z"),
      fundingSource: "GUC",
    });

    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4,
      comment: "Event 1",
    });

    await RatingModel.create({
      user: user2._id,
      event: otherEvent._id,
      rating: 3,
      comment: "Event 2",
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.totalRatings).toBe(1);
    expect(result.data?.ratings[0].comment).toBe("Event 1");
  });

  it("should handle decimal ratings correctly in average calculation", async () => {
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4.5,
    });

    await RatingModel.create({
      user: user2._id,
      event: event._id,
      rating: 3.5,
    });

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    // (4.5 + 3.5) / 2 = 4.0
    expect(result.data?.averageRating).toBe(4);
  });

  it("should handle database errors gracefully", async () => {
    jest.spyOn(EventModel, "findById").mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValueOnce(new Error("Database error")),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await expect(getEventRatings(event._id.toString())).rejects.toThrow(
      "Database error"
    );
  });

  it("should handle large number of ratings", async () => {
    // Create 100 ratings
    const ratings = [];
    for (let i = 0; i < 100; i++) {
      const user = await UserModel.create({
        firstName: `User${i}`,
        lastName: "Test",
        email: `user${i}@guc.edu.eg`,
        password: "password123",
        role: userRole.STUDENT,
        studentId: `STU${i}`,
        status: userStatus.ACTIVE,
        verified: true,
      });

      ratings.push({
        user: user._id,
        event: event._id,
        rating: (i % 5) + 1, // Ratings from 1 to 5
      });
    }
    await RatingModel.insertMany(ratings);

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.totalRatings).toBe(100);
    expect(result.data?.ratings).toHaveLength(100);
  });

  it("should handle ratings without user data", async () => {
    // Create a rating and then delete the user
    await RatingModel.create({
      user: user1._id,
      event: event._id,
      rating: 4,
      comment: "Good event",
    });

    await UserModel.findByIdAndDelete(user1._id);

    const result = await getEventRatings(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.totalRatings).toBe(1);
    expect(result.data?.ratings[0].user).toBeUndefined();
  });
});
