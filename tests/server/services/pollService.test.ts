import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import PollModel, { IPoll } from "../../../server/models/Poll";
import EventModel, {
  BazaarBoothSize,
  EventType,
  FundingSource,
  IEvent,
  Location,
} from "../../../server/models/Event";
import UserModel, {
  IUser,
  userRole,
  userStatus,
} from "../../../server/models/User";
import VendorModel, {
  IVendor,
  VendorStatus,
} from "../../../server/models/Vendor";
import {
  createVendorBoothPoll,
  CreateVendorBoothPollInput,
  listVendorBoothPolls,
  voteForVendor,
} from "../../../server/services/pollService";

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

describe("createVendorBoothPoll", () => {
  let vendor1: IVendor & { _id: Types.ObjectId };
  let vendor2: IVendor & { _id: Types.ObjectId };
  let vendor3: IVendor & { _id: Types.ObjectId };
  let pendingVendor: IVendor & { _id: Types.ObjectId };
  let event: IEvent & { _id: Types.ObjectId };
  let eventId = "";
  const boothLocation = "Main Bazaar Hall";

  beforeEach(async () => {
    const eventDoc = new EventModel({
      name: "Winter Bazaar",
      eventType: EventType.BAZAAR,
      description: "Seasonal bazaar event",
      date: new Date("2025-12-01T09:00:00Z"),
      location: Location.GUCCAIRO,
      startDate: new Date("2025-12-01T09:00:00Z"),
      endDate: new Date("2025-12-02T17:00:00Z"),
      registrationDeadline: new Date("2025-11-20T23:59:59Z"),
      fundingSource: FundingSource.GUC,
      revenue: 0,
      archived: false,
      registeredUsers: [],
      vendors: [],
    });
    await eventDoc.save();
    event = eventDoc.toObject() as IEvent & { _id: Types.ObjectId };
    event._id = eventDoc._id as Types.ObjectId;
    eventId = event._id.toString();

    const buildApplication = (
      email: string,
      status: VendorStatus = VendorStatus.APPROVED
    ) => ({
      eventId: event._id,
      status,
      attendees: [
        {
          name: "Vendor Representative",
          email,
        },
      ],
      boothSize: BazaarBoothSize.SMALL,
      boothInfo: {
        boothLocation,
      },
    });

    const vendor1Doc = new VendorModel({
      email: "vendor1@example.com",
      password: "password123",
      companyName: "Vendor One",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
      applications: [buildApplication("vendor1.rep@example.com")],
    });
    await vendor1Doc.save();
    vendor1 = vendor1Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor1._id = vendor1Doc._id as Types.ObjectId;

    const vendor2Doc = new VendorModel({
      email: "vendor2@example.com",
      password: "password123",
      companyName: "Vendor Two",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
      applications: [buildApplication("vendor2.rep@example.com")],
    });
    await vendor2Doc.save();
    vendor2 = vendor2Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor2._id = vendor2Doc._id as Types.ObjectId;

    const vendor3Doc = new VendorModel({
      email: "vendor3@example.com",
      password: "password123",
      companyName: "Vendor Three",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
      applications: [buildApplication("vendor3.rep@example.com")],
    });
    await vendor3Doc.save();
    vendor3 = vendor3Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor3._id = vendor3Doc._id as Types.ObjectId;

    const pendingVendorDoc = new VendorModel({
      email: "pending@example.com",
      password: "password123",
      companyName: "Pending Vendor",
      verified: false,
      verificationStatus: VendorStatus.PENDING,
      applications: [
        buildApplication("pending.rep@example.com", VendorStatus.PENDING),
      ],
    });
    await pendingVendorDoc.save();
    pendingVendor = pendingVendorDoc.toObject() as IVendor & {
      _id: Types.ObjectId;
    };
    pendingVendor._id = pendingVendorDoc._id as Types.ObjectId;
  });

  const buildInput = (
    overrides: Partial<CreateVendorBoothPollInput> = {}
  ): CreateVendorBoothPollInput => ({
    boothName: overrides.boothName ?? "Food Booth",
    boothLocation: overrides.boothLocation ?? boothLocation,
    eventId: overrides.eventId ?? eventId,
    durations:
      overrides.durations ?? [
        {
          start: "2025-12-01T10:00:00Z",
          end: "2025-12-01T12:00:00Z",
        },
      ],
    vendorIds:
      overrides.vendorIds ?? [
        vendor1._id.toString(),
        vendor2._id.toString(),
      ],
  });

  it("should reject poll with missing booth location", async () => {
    const input = buildInput({ boothLocation: "   " });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("boothLocation is required");
  });

  it("should reject poll with missing booth name", async () => {
    const input = buildInput({ boothName: "" });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("boothName is required");
  });

  it("should reject poll with whitespace-only booth name", async () => {
    const input = buildInput({ boothName: "   " });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("boothName is required");
  });

  it("should reject poll with invalid event id", async () => {
    const input = buildInput({ eventId: "invalid-id" });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Valid eventId is required");
  });

  it("should reject poll when event does not exist", async () => {
    const fakeEventId = new Types.ObjectId().toString();
    const input = buildInput({ eventId: fakeEventId });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Event not found");
  });

  it("should require matching vendor applications at the same location", async () => {
    const input = buildInput({ boothLocation: "Conference Hall" });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "At least two approved vendors with matching applications (same event and booth location) are required."
    );
  });

  it("should reject poll with empty durations array", async () => {
    const input = buildInput({ durations: [] });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("At least one duration range is required");
  });

  it("should reject poll with missing durations", async () => {
    const input = {
      boothName: "Food Booth",
      boothLocation,
      eventId,
      vendorIds: [vendor1._id.toString(), vendor2._id.toString()],
    } as CreateVendorBoothPollInput;

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("At least one duration range is required");
  });

  it("should reject poll with invalid duration format", async () => {
    const input = buildInput({
      durations: [
        {
          start: "invalid-date",
          end: "2025-12-01T12:00:00Z",
        },
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "Each duration must include valid ISO dates with start < end"
    );
  });

  it("should reject poll with start date after end date", async () => {
    const input = buildInput({
      durations: [
        {
          start: "2025-12-01T14:00:00Z",
          end: "2025-12-01T12:00:00Z",
        },
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "Each duration must include valid ISO dates with start < end"
    );
  });

  it("should reject poll with equal start and end dates", async () => {
    const input = buildInput({
      durations: [
        {
          start: "2025-12-01T12:00:00Z",
          end: "2025-12-01T12:00:00Z",
        },
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "Each duration must include valid ISO dates with start < end"
    );
  });

  it("should reject poll with missing duration start", async () => {
    const input = buildInput({
      durations: [
        {
          start: "",
          end: "2025-12-01T12:00:00Z",
        },
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "Each duration must include valid ISO dates with start < end"
    );
  });

  it("should reject poll with missing duration end", async () => {
    const input = buildInput({
      durations: [
        {
          start: "2025-12-01T10:00:00Z",
          end: "",
        },
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(
      "Each duration must include valid ISO dates with start < end"
    );
  });

  it("should reject poll with only one vendor", async () => {
    const input = buildInput({ vendorIds: [vendor1._id.toString()] });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Provide at least two vendors to compare");
  });

  it("should reject poll with no vendors", async () => {
    const input = buildInput({ vendorIds: [] });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Provide at least two vendors to compare");
  });

  it("should reject poll with invalid vendor id", async () => {
    const input = buildInput({
      vendorIds: ["invalid-id", vendor1._id.toString()],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid vendor id: invalid-id");
  });

  it("should reject poll with non-existent vendor", async () => {
    const fakeVendorId = new Types.ObjectId().toString();
    const input = buildInput({
      vendorIds: [fakeVendorId, vendor1._id.toString()],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe(
      "One or more vendors were not found or not approved"
    );
  });

  it("should reject poll with pending vendor", async () => {
    const input = buildInput({
      vendorIds: [vendor1._id.toString(), pendingVendor._id.toString()],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe(
      "One or more vendors were not found or not approved"
    );
  });

  it("should successfully create poll with two vendors", async () => {
    const input = buildInput();

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(result.data?.poll).toBeDefined();
    expect(result.data?.poll.boothName).toBe("Food Booth");
    expect(result.data?.poll.boothLocation).toBe(boothLocation);
    expect(result.data?.poll.event?.toString()).toBe(eventId);
    expect(result.data?.poll.durations).toHaveLength(1);
    expect(result.data?.poll.vendorsWithVotes).toHaveLength(2);
    expect(result.data?.poll.vendorsWithVotes[0].votes).toBe(0);
    expect(result.data?.poll.vendorsWithVotes[1].votes).toBe(0);

    const savedPoll = await PollModel.findById(result.data?.poll._id);
    expect(savedPoll).toBeDefined();
    expect(savedPoll?.boothName).toBe("Food Booth");
    expect(savedPoll?.boothLocation).toBe(boothLocation);
    expect(savedPoll?.event?.toString()).toBe(eventId);
  });

  it("should successfully create poll with three vendors", async () => {
    const input = buildInput({
      boothName: "Electronics Booth",
      vendorIds: [
        vendor1._id.toString(),
        vendor2._id.toString(),
        vendor3._id.toString(),
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(201);
    expect(result.data?.poll.vendorsWithVotes).toHaveLength(3);
  });

  it("should successfully create poll with multiple durations", async () => {
    const input = buildInput({
      boothName: "Clothing Booth",
      durations: [
        {
          start: "2025-12-01T10:00:00Z",
          end: "2025-12-01T12:00:00Z",
        },
        {
          start: "2025-12-01T14:00:00Z",
          end: "2025-12-01T16:00:00Z",
        },
        {
          start: "2025-12-02T10:00:00Z",
          end: "2025-12-02T12:00:00Z",
        },
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(true);
    expect(result.data?.poll.durations).toHaveLength(3);
  });

  it("should deduplicate vendor ids", async () => {
    const input = buildInput({
      vendorIds: [
        vendor1._id.toString(),
        vendor2._id.toString(),
        vendor1._id.toString(),
      ],
    });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(true);
    expect(result.data?.poll.vendorsWithVotes).toHaveLength(2);
  });

  it("should handle database errors gracefully", async () => {
    jest
      .spyOn(PollModel, "create")
      .mockRejectedValueOnce(new Error("Database error"));

    const input = buildInput();

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Failed to create poll");
  });

  it("should trim booth name", async () => {
    const input = buildInput({ boothName: "  Food Booth  " });

    const result = await createVendorBoothPoll(input);

    expect(result.success).toBe(true);
    expect(result.data?.poll.boothName).toBe("Food Booth");
  });
});

describe("voteForVendor", () => {
  let user: IUser & { _id: Types.ObjectId };
  let user2: IUser & { _id: Types.ObjectId };
  let vendor1: IVendor & { _id: Types.ObjectId };
  let vendor2: IVendor & { _id: Types.ObjectId };
  let poll: IPoll & { _id: Types.ObjectId };

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

    const vendor1Doc = new VendorModel({
      email: "vendor1@example.com",
      password: "password123",
      companyName: "Vendor One",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
    });
    await vendor1Doc.save();
    vendor1 = vendor1Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor1._id = vendor1Doc._id as Types.ObjectId;

    const vendor2Doc = new VendorModel({
      email: "vendor2@example.com",
      password: "password123",
      companyName: "Vendor Two",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
    });
    await vendor2Doc.save();
    vendor2 = vendor2Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor2._id = vendor2Doc._id as Types.ObjectId;

    const pollDoc = new PollModel({
      boothName: "Test Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 0 },
        { vendor: vendor2._id, votes: 0 },
      ],
      votesByUser: [],
    });
    await pollDoc.save();
    poll = pollDoc.toObject() as IPoll & { _id: Types.ObjectId };
    poll._id = pollDoc._id as Types.ObjectId;
  });

  it("should reject vote with invalid poll id", async () => {
    const result = await voteForVendor(
      "invalid-id",
      user._id.toString(),
      vendor1._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid poll id");
  });

  it("should reject vote with invalid user id", async () => {
    const result = await voteForVendor(
      poll._id.toString(),
      "invalid-id",
      vendor1._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid user id");
  });

  it("should reject vote with invalid vendor id", async () => {
    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      "invalid-id"
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Invalid vendor id");
  });

  it("should reject vote for non-existent poll", async () => {
    const fakePollId = new Types.ObjectId().toString();
    const result = await voteForVendor(
      fakePollId,
      user._id.toString(),
      vendor1._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Poll not found");
  });

  it("should reject vote for vendor not in poll", async () => {
    const vendor3 = await VendorModel.create({
      email: "vendor3@example.com",
      password: "password123",
      companyName: "Vendor Three",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
    });

    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor3._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe("Selected vendor is not part of this poll");
  });

  it("should successfully record first vote", async () => {
    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe("Vote recorded");
    expect(result.data?.poll).toBeDefined();

    // Verify vote was recorded
    const updatedPoll = await PollModel.findById(poll._id);
    expect(updatedPoll?.votesByUser).toHaveLength(1);
    expect(updatedPoll?.votesByUser[0].user.toString()).toBe(
      user._id.toString()
    );
    expect(updatedPoll?.votesByUser[0].vendor.toString()).toBe(
      vendor1._id.toString()
    );

    // Verify vote count was incremented
    const vendor1Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor1._id)
    );
    expect(vendor1Entry?.votes).toBe(1);
  });

  it("should successfully record multiple votes from different users", async () => {
    await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );
    await voteForVendor(
      poll._id.toString(),
      user2._id.toString(),
      vendor1._id.toString()
    );

    const updatedPoll = await PollModel.findById(poll._id);
    expect(updatedPoll?.votesByUser).toHaveLength(2);

    const vendor1Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor1._id)
    );
    expect(vendor1Entry?.votes).toBe(2);
  });

  it("should allow user to change vote", async () => {
    // First vote for vendor1
    await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    // Change vote to vendor2
    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor2._id.toString()
    );

    expect(result.success).toBe(true);

    const updatedPoll = await PollModel.findById(poll._id);
    expect(updatedPoll?.votesByUser).toHaveLength(1);
    expect(updatedPoll?.votesByUser[0].vendor.toString()).toBe(
      vendor2._id.toString()
    );

    // Vendor1 should have 0 votes, vendor2 should have 1
    const vendor1Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor1._id)
    );
    const vendor2Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor2._id)
    );
    expect(vendor1Entry?.votes).toBe(0);
    expect(vendor2Entry?.votes).toBe(1);
  });

  it("should not change vote count when voting for same vendor twice", async () => {
    await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    expect(result.success).toBe(true);

    const updatedPoll = await PollModel.findById(poll._id);
    const vendor1Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor1._id)
    );
    expect(vendor1Entry?.votes).toBe(1); // Still 1, not incremented
  });

  it("should handle vote changes correctly with multiple users", async () => {
    // User1 votes for vendor1
    await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    // User2 votes for vendor2
    await voteForVendor(
      poll._id.toString(),
      user2._id.toString(),
      vendor2._id.toString()
    );

    // User1 changes vote to vendor2
    await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor2._id.toString()
    );

    const updatedPoll = await PollModel.findById(poll._id);
    const vendor1Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor1._id)
    );
    const vendor2Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor2._id)
    );

    expect(vendor1Entry?.votes).toBe(0);
    expect(vendor2Entry?.votes).toBe(2);
  });

  it("should handle database errors gracefully", async () => {
    jest.spyOn(PollModel, "findById").mockResolvedValueOnce(null);

    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe("Poll not found");
  });

  it("should handle save errors gracefully", async () => {
    jest
      .spyOn(PollModel.prototype, "save")
      .mockRejectedValueOnce(new Error("Database error"));

    const result = await voteForVendor(
      poll._id.toString(),
      user._id.toString(),
      vendor1._id.toString()
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("Failed to record vote");
  });

  it("should not decrement votes below zero when changing vote", async () => {
    // Manually create a poll with 0 votes
    const pollDoc = (await PollModel.create({
      boothName: "Zero Vote Test",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 0 },
        { vendor: vendor2._id, votes: 0 },
      ],
      votesByUser: [{ user: user._id, vendor: vendor1._id }],
    })) as IPoll & { _id: Types.ObjectId };

    // Change vote from vendor1 to vendor2
    await voteForVendor(
      pollDoc._id.toString(),
      user._id.toString(),
      vendor2._id.toString()
    );

    const updatedPoll = await PollModel.findById(pollDoc._id);
    const vendor1Entry = updatedPoll?.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendor1._id)
    );
    expect(vendor1Entry?.votes).toBe(0); // Should not go negative
  });
});

describe("listVendorBoothPolls", () => {
  let user: IUser & { _id: Types.ObjectId };
  let vendor1: IVendor & { _id: Types.ObjectId };
  let vendor2: IVendor & { _id: Types.ObjectId };
  let vendor3: IVendor & { _id: Types.ObjectId };

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

    const vendor1Doc = new VendorModel({
      email: "vendor1@example.com",
      password: "password123",
      companyName: "Vendor One",
      logo: "logo1.png",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
    });
    await vendor1Doc.save();
    vendor1 = vendor1Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor1._id = vendor1Doc._id as Types.ObjectId;

    const vendor2Doc = new VendorModel({
      email: "vendor2@example.com",
      password: "password123",
      companyName: "Vendor Two",
      logo: "logo2.png",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
    });
    await vendor2Doc.save();
    vendor2 = vendor2Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor2._id = vendor2Doc._id as Types.ObjectId;

    const vendor3Doc = new VendorModel({
      email: "vendor3@example.com",
      password: "password123",
      companyName: "Vendor Three",
      verified: true,
      verificationStatus: VendorStatus.APPROVED,
    });
    await vendor3Doc.save();
    vendor3 = vendor3Doc.toObject() as IVendor & { _id: Types.ObjectId };
    vendor3._id = vendor3Doc._id as Types.ObjectId;
  });

  it("should return empty array when no polls exist", async () => {
    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls).toEqual([]);
  });

  it("should list all polls without user context", async () => {
    await PollModel.create({
      boothName: "Food Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 3 },
        { vendor: vendor2._id, votes: 5 },
      ],
    });

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls).toHaveLength(1);
    expect(result.polls![0].boothName).toBe("Food Booth");
    expect(result.polls![0].vendors).toHaveLength(2);
    expect(result.polls![0].totalVotes).toBe(8);
    expect(result.polls![0].selectedVendorId).toBeUndefined();
  });

  it("should include user's selected vendor when user id provided", async () => {
    await PollModel.create({
      boothName: "Electronics Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 2 },
        { vendor: vendor2._id, votes: 3 },
      ],
      votesByUser: [{ user: user._id, vendor: vendor1._id }],
    });

    const result = await listVendorBoothPolls(user._id.toString());

    expect(result.success).toBe(true);
    expect(result.polls).toHaveLength(1);
    expect(result.polls![0].selectedVendorId).toBe(vendor1._id.toString());
  });

  it("should list multiple polls sorted by creation date", async () => {
    // Create polls with slight time difference
    await PollModel.create({
      boothName: "Booth A",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 0 },
        { vendor: vendor2._id, votes: 0 },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await PollModel.create({
      boothName: "Booth B",
      durations: [
        {
          start: new Date("2025-12-02T10:00:00Z"),
          end: new Date("2025-12-02T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor2._id, votes: 0 },
        { vendor: vendor3._id, votes: 0 },
      ],
    });

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls).toHaveLength(2);
    // Should be sorted by createdAt descending (newest first)
    expect(result.polls![0].boothName).toBe("Booth B");
    expect(result.polls![1].boothName).toBe("Booth A");
  });

  it("should include vendor details in response", async () => {
    await PollModel.create({
      boothName: "Test Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 5 },
        { vendor: vendor2._id, votes: 3 },
      ],
    });

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls![0].vendors[0]).toMatchObject({
      vendorId: vendor1._id.toString(),
      vendorName: "Vendor One",
      logo: "logo1.png",
      votes: 5,
    });
    expect(result.polls![0].vendors[1]).toMatchObject({
      vendorId: vendor2._id.toString(),
      vendorName: "Vendor Two",
      logo: "logo2.png",
      votes: 3,
    });
  });

  it("should format durations as ISO strings", async () => {
    const startDate = new Date("2025-12-01T10:00:00Z");
    const endDate = new Date("2025-12-01T12:00:00Z");

    await PollModel.create({
      boothName: "Test Booth",
      durations: [{ start: startDate, end: endDate }],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 0 },
        { vendor: vendor2._id, votes: 0 },
      ],
    });

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls![0].durations[0]).toEqual({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
  });

  it("should handle multiple durations", async () => {
    await PollModel.create({
      boothName: "Multi Duration Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
        {
          start: new Date("2025-12-01T14:00:00Z"),
          end: new Date("2025-12-01T16:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 0 },
        { vendor: vendor2._id, votes: 0 },
      ],
    });

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls![0].durations).toHaveLength(2);
  });

  it("should calculate total votes correctly", async () => {
    await PollModel.create({
      boothName: "Vote Count Test",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 10 },
        { vendor: vendor2._id, votes: 15 },
        { vendor: vendor3._id, votes: 5 },
      ],
    });

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(true);
    expect(result.polls![0].totalVotes).toBe(30);
  });

  it("should handle invalid user id gracefully", async () => {
    await PollModel.create({
      boothName: "Test Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 0 },
        { vendor: vendor2._id, votes: 0 },
      ],
    });

    const result = await listVendorBoothPolls("invalid-id");

    expect(result.success).toBe(true);
    expect(result.polls![0].selectedVendorId).toBeUndefined();
  });

  it("should handle database errors gracefully", async () => {
    jest.spyOn(PollModel, "find").mockReturnValueOnce({
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValueOnce(new Error("Database error")),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await listVendorBoothPolls();

    expect(result.success).toBe(false);
    expect(result.message).toBe("Failed to load vendor polls");
  });

  it("should not show selected vendor for different user", async () => {
    const otherUser = await UserModel.create({
      firstName: "Other",
      lastName: "User",
      email: "other@guc.edu.eg",
      password: "password123",
      role: userRole.STUDENT,
      studentId: "STU999",
      status: userStatus.ACTIVE,
      verified: true,
    });

    await PollModel.create({
      boothName: "Test Booth",
      durations: [
        {
          start: new Date("2025-12-01T10:00:00Z"),
          end: new Date("2025-12-01T12:00:00Z"),
        },
      ],
      vendorsWithVotes: [
        { vendor: vendor1._id, votes: 1 },
        { vendor: vendor2._id, votes: 0 },
      ],
      votesByUser: [{ user: user._id, vendor: vendor1._id }],
    });

    const result = await listVendorBoothPolls(otherUser._id.toString());

    expect(result.success).toBe(true);
    expect(result.polls![0].selectedVendorId).toBeUndefined();
  });
});
