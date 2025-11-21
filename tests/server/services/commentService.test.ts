import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import CommentModel, { CommentStatus } from "../../../server/models/Comment";
import EventModel from "../../../server/models/Event";
import UserModel from "../../../server/models/User";
import {
  createComment,
  getEventComments,
  deleteCommentAsAdmin,
} from "../../../server/services/commentService";
import { emailService } from "../../../server/services/emailService";

jest.mock("../../../server/services/emailService");

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

describe("createComment", () => {
  let user: any;
  let event: any;

  beforeEach(async () => {
    user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    event = new EventModel({
      name: "Test Event",
      eventType: "Workshop",
      description: "Test event",
      date: new Date("2020-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-01-02"),
      registrationDeadline: new Date("2019-12-31"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });
    await event.save();

    user.registeredEvents = [event._id.toString()];
    await user.save();
  });

  it("should successfully create a comment", async () => {
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "This is a test comment",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Comment added successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.content).toBe("This is a test comment");
    expect(result.data?.eventId).toBe(event._id.toString());
    expect(result.data?.user.id).toBe(user._id.toString());
    expect(result.data?.user.firstName).toBe("John");
    expect(result.data?.user.lastName).toBe("Doe");
    expect(result.data?.createdAt).toBeDefined();
    expect(result.data?.updatedAt).toBeDefined();

    const savedComment = await CommentModel.findById(result.data?.id);
    expect(savedComment).toBeDefined();
    expect(savedComment?.content).toBe("This is a test comment");
  });

  it("should fail with invalid event ID", async () => {
    const result = await createComment(user._id.toString(), {
      eventId: "invalid-id",
      content: "Test comment",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid event identifier.");
    expect(result.statusCode).toBe(400);
  });

  it("should fail with empty content", async () => {
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "",
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("Comment content is required");
  });

  it("should fail with content exceeding 2000 characters", async () => {
    const longContent = "a".repeat(2001);
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: longContent,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("cannot exceed 2000 characters");
  });

  it("should accept content with exactly 2000 characters", async () => {
    const maxContent = "a".repeat(2000);
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: maxContent,
    });

    expect(result.success).toBe(true);
    expect(result.data?.content).toBe(maxContent);
  });

  it("should trim whitespace from content", async () => {
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "  Test comment with spaces  ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.content).toBe("Test comment with spaces");
  });

  it("should fail when user not found", async () => {
    const fakeUserId = new Types.ObjectId().toString();
    const result = await createComment(fakeUserId, {
      eventId: event._id.toString(),
      content: "Test comment",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("User not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should fail when event not found", async () => {
    const fakeEventId = new Types.ObjectId().toString();
    const result = await createComment(user._id.toString(), {
      eventId: fakeEventId,
      content: "Test comment",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Event not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should fail when user has not attended event", async () => {
    const otherUser = new UserModel({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU002",
      status: "Active",
      verified: true,
    });
    await otherUser.save();

    const result = await createComment(otherUser._id.toString(), {
      eventId: event._id.toString(),
      content: "Test comment",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("You can only comment on events you attended.");
    expect(result.statusCode).toBe(403);
  });

  it("should allow comment when user registered via event registeredUsers", async () => {
    const otherUser = new UserModel({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU002",
      status: "Active",
      verified: true,
    });
    await otherUser.save();

    event.registeredUsers.push(otherUser._id.toString());
    await event.save();

    const result = await createComment(otherUser._id.toString(), {
      eventId: event._id.toString(),
      content: "Test comment",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Comment added successfully.");
  });

  it("should fail when event has not started", async () => {
    const futureEvent = new EventModel({
      name: "Future Event",
      eventType: "Seminar",
      description: "Future event",
      date: new Date("2030-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2030-01-01"),
      endDate: new Date("2030-01-02"),
      registrationDeadline: new Date("2029-12-31"),
      fundingSource: "GUC",
      registeredUsers: [user._id.toString()],
    });
    await futureEvent.save();

    user.registeredEvents.push(futureEvent._id.toString());
    await user.save();

    const result = await createComment(user._id.toString(), {
      eventId: futureEvent._id.toString(),
      content: "Test comment",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Comments are only available after the event starts."
    );
    expect(result.statusCode).toBe(400);
  });

  it("should successfully create a reply to a comment", async () => {
    const parentComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Parent comment",
    });
    await parentComment.save();

    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "Reply comment",
      parentCommentId: parentComment._id.toString(),
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Comment added successfully.");
    expect(result.data?.parentCommentId).toBe(parentComment._id.toString());
  });

  it("should fail with invalid parent comment ID", async () => {
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "Reply comment",
      parentCommentId: "invalid-id",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid parent comment identifier.");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when parent comment not found", async () => {
    const fakeCommentId = new Types.ObjectId().toString();
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "Reply comment",
      parentCommentId: fakeCommentId,
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Parent comment not found for this event.");
    expect(result.statusCode).toBe(404);
  });

  it("should fail when parent comment belongs to different event", async () => {
    const otherEvent = new EventModel({
      name: "Other Event",
      eventType: "Conference",
      description: "Other event",
      date: new Date("2020-02-01"),
      location: "GUC Berlin",
      startDate: new Date("2020-02-01"),
      endDate: new Date("2020-02-02"),
      registrationDeadline: new Date("2020-01-31"),
      fundingSource: "External",
      registeredUsers: [user._id.toString()],
    });
    await otherEvent.save();

    const commentOnOtherEvent = new CommentModel({
      user: user._id,
      event: otherEvent._id,
      content: "Comment on other event",
    });
    await commentOnOtherEvent.save();

    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "Reply comment",
      parentCommentId: commentOnOtherEvent._id.toString(),
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Parent comment not found for this event.");
    expect(result.statusCode).toBe(404);
  });

  it("should include user role in response", async () => {
    const professor = new UserModel({
      firstName: "Prof",
      lastName: "Smith",
      email: "prof@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
      registeredEvents: [event._id.toString()],
    });
    await professor.save();

    event.registeredUsers.push(professor._id.toString());
    await event.save();

    const result = await createComment(professor._id.toString(), {
      eventId: event._id.toString(),
      content: "Professor comment",
    });

    expect(result.success).toBe(true);
    expect(result.data?.user.role).toBe("Professor");
  });

  it("should set default status to visible", async () => {
    const result = await createComment(user._id.toString(), {
      eventId: event._id.toString(),
      content: "Test comment",
    });

    expect(result.success).toBe(true);
    const savedComment = await CommentModel.findById(result.data?.id);
    expect(savedComment?.status).toBe(CommentStatus.VISIBLE);
  });
});

describe("getEventComments", () => {
  let user: any;
  let event: any;

  beforeEach(async () => {
    user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    event = new EventModel({
      name: "Test Event",
      eventType: "Workshop",
      description: "Test event",
      date: new Date("2020-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-01-02"),
      registrationDeadline: new Date("2019-12-31"),
      fundingSource: "GUC",
    });
    await event.save();
  });

  it("should fail with invalid event ID", async () => {
    const result = await getEventComments("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid event identifier.");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when event not found", async () => {
    const fakeEventId = new Types.ObjectId().toString();
    const result = await getEventComments(fakeEventId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Event not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should return empty array when no comments exist", async () => {
    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Comments retrieved successfully.");
    expect(result.data).toEqual([]);
  });

  it("should return all visible comments for event", async () => {
    const comment1 = new CommentModel({
      user: user._id,
      event: event._id,
      content: "First comment",
      status: CommentStatus.VISIBLE,
    });
    const comment2 = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Second comment",
      status: CommentStatus.VISIBLE,
    });
    await comment1.save();
    await comment2.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.map((c) => c.content)).toContain("First comment");
    expect(result.data?.map((c) => c.content)).toContain("Second comment");
  });

  it("should not return hidden comments", async () => {
    const visibleComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Visible comment",
      status: CommentStatus.VISIBLE,
    });
    const hiddenComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Hidden comment",
      status: CommentStatus.HIDDEN,
    });
    await visibleComment.save();
    await hiddenComment.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].content).toBe("Visible comment");
  });

  it("should return comments sorted by creation date descending", async () => {
    const comment1 = new CommentModel({
      user: user._id,
      event: event._id,
      content: "First comment",
      createdAt: new Date("2020-01-01T10:00:00Z"),
    });
    const comment2 = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Second comment",
      createdAt: new Date("2020-01-01T11:00:00Z"),
    });
    const comment3 = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Third comment",
      createdAt: new Date("2020-01-01T09:00:00Z"),
    });
    await comment1.save();
    await comment2.save();
    await comment3.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data?.[0].content).toBe("Second comment");
    expect(result.data?.[1].content).toBe("First comment");
    expect(result.data?.[2].content).toBe("Third comment");
  });

  it("should include user information in comments", async () => {
    const comment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Test comment",
    });
    await comment.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].user.id).toBe(user._id.toString());
    expect(result.data?.[0].user.firstName).toBe("John");
    expect(result.data?.[0].user.lastName).toBe("Doe");
    expect(result.data?.[0].user.role).toBe("Student");
  });

  it("should include all required comment fields", async () => {
    const comment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Test comment",
    });
    await comment.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    const commentData = result.data?.[0];
    expect(commentData).toHaveProperty("id");
    expect(commentData).toHaveProperty("content");
    expect(commentData).toHaveProperty("eventId");
    expect(commentData).toHaveProperty("user");
    expect(commentData).toHaveProperty("status");
    expect(commentData).toHaveProperty("createdAt");
    expect(commentData).toHaveProperty("updatedAt");
  });

  it("should only return comments for specified event", async () => {
    const otherEvent = new EventModel({
      name: "Other Event",
      eventType: "Seminar",
      description: "Other event",
      date: new Date("2020-02-01"),
      location: "GUC Berlin",
      startDate: new Date("2020-02-01"),
      endDate: new Date("2020-02-02"),
      registrationDeadline: new Date("2020-01-31"),
      fundingSource: "External",
    });
    await otherEvent.save();

    const comment1 = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Comment on event 1",
    });
    const comment2 = new CommentModel({
      user: user._id,
      event: otherEvent._id,
      content: "Comment on event 2",
    });
    await comment1.save();
    await comment2.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].content).toBe("Comment on event 1");
    expect(result.data?.[0].eventId).toBe(event._id.toString());
  });

  it("should include parentCommentId when comment is a reply", async () => {
    const parentComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Parent comment",
    });
    await parentComment.save();

    const replyComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Reply comment",
      parentComment: parentComment._id,
    });
    await replyComment.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    const reply = result.data?.find((c) => c.content === "Reply comment");
    expect(reply?.parentCommentId).toBe(parentComment._id.toString());
  });

  it("should return flagged comments", async () => {
    const flaggedComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Flagged comment",
      status: CommentStatus.FLAGGED,
    });
    await flaggedComment.save();

    const result = await getEventComments(event._id.toString());

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].content).toBe("Flagged comment");
    expect(result.data?.[0].status).toBe(CommentStatus.FLAGGED);
  });
});

describe("deleteCommentAsAdmin", () => {
  let user: any;
  let event: any;
  let comment: any;

  beforeEach(async () => {
    user = new UserModel({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      role: "Student",
      studentId: "STU001",
      status: "Active",
      verified: true,
    });
    await user.save();

    event = new EventModel({
      name: "Test Event",
      eventType: "Workshop",
      description: "Test event",
      date: new Date("2020-01-01"),
      location: "GUC Cairo",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-01-02"),
      registrationDeadline: new Date("2019-12-31"),
      fundingSource: "GUC",
    });
    await event.save();

    comment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Test comment to delete",
    });
    await comment.save();
  });

  it("should successfully delete a comment", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const result = await deleteCommentAsAdmin(comment._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Comment deleted successfully.");
    expect(result.data?.deletedCommentId).toBe(comment._id.toString());

    const deletedComment = await CommentModel.findById(comment._id);
    expect(deletedComment).toBeNull();
  });

  it("should fail with invalid comment ID", async () => {
    const result = await deleteCommentAsAdmin("invalid-id");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid comment identifier.");
    expect(result.statusCode).toBe(400);
  });

  it("should fail when comment not found", async () => {
    const fakeCommentId = new Types.ObjectId().toString();
    const result = await deleteCommentAsAdmin(fakeCommentId);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Comment not found.");
    expect(result.statusCode).toBe(404);
  });

  it("should send warning email to student user", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const reason = "Inappropriate content";
    await deleteCommentAsAdmin(comment._id.toString(), reason);

    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "Student",
        }),
        eventName: "Test Event",
        commentContent: "Test comment to delete",
        reason: "Inappropriate content",
      })
    );
  });

  it("should send warning email to professor user", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const professor = new UserModel({
      firstName: "Prof",
      lastName: "Smith",
      email: "prof@example.com",
      password: "password123",
      role: "Professor",
      staffId: "PROF001",
      status: "Active",
      verified: true,
    });
    await professor.save();

    const profComment = new CommentModel({
      user: professor._id,
      event: event._id,
      content: "Professor comment",
    });
    await profComment.save();

    await deleteCommentAsAdmin(profComment._id.toString());

    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          role: "Professor",
        }),
      })
    );
  });

  it("should send warning email to staff user", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const staff = new UserModel({
      firstName: "Staff",
      lastName: "Member",
      email: "staff@example.com",
      password: "password123",
      role: "Staff",
      staffId: "STAFF001",
      status: "Active",
      verified: true,
    });
    await staff.save();

    const staffComment = new CommentModel({
      user: staff._id,
      event: event._id,
      content: "Staff comment",
    });
    await staffComment.save();

    await deleteCommentAsAdmin(staffComment._id.toString());

    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalled();
  });

  it("should send warning email to TA user", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const ta = new UserModel({
      firstName: "Teaching",
      lastName: "Assistant",
      email: "ta@example.com",
      password: "password123",
      role: "TA",
      staffId: "TA001",
      status: "Active",
      verified: true,
    });
    await ta.save();

    const taComment = new CommentModel({
      user: ta._id,
      event: event._id,
      content: "TA comment",
    });
    await taComment.save();

    await deleteCommentAsAdmin(taComment._id.toString());

    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalled();
  });

  it("should delete comment without reason", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const result = await deleteCommentAsAdmin(comment._id.toString());

    expect(result.success).toBe(true);
    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: undefined,
      })
    );
  });

  it("should handle email sending errors gracefully", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockRejectedValue(
      new Error("Email service error")
    );

    const result = await deleteCommentAsAdmin(comment._id.toString());

    expect(result.success).toBe(true);
    expect(result.message).toBe("Comment deleted successfully.");

    const deletedComment = await CommentModel.findById(comment._id);
    expect(deletedComment).toBeNull();
  });

  it("should include event date in warning email", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    await deleteCommentAsAdmin(comment._id.toString());

    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        eventDate: expect.any(Date),
      })
    );
  });

  it("should use endDate as event date if available", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const endDate = new Date("2020-01-02");
    event.endDate = endDate;
    await event.save();

    await deleteCommentAsAdmin(comment._id.toString());

    expect(emailService.sendCommentDeletionWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        eventDate: endDate,
      })
    );
  });

  it("should delete comment with all statuses", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    for (const status of Object.values(CommentStatus)) {
      const statusComment = new CommentModel({
        user: user._id,
        event: event._id,
        content: `Comment with ${status} status`,
        status,
      });
      await statusComment.save();

      const result = await deleteCommentAsAdmin(statusComment._id.toString());

      expect(result.success).toBe(true);
      const deletedComment = await CommentModel.findById(statusComment._id);
      expect(deletedComment).toBeNull();
    }
  });

  it("should delete reply comments", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const parentComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Parent comment",
    });
    await parentComment.save();

    const replyComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Reply comment",
      parentComment: parentComment._id,
    });
    await replyComment.save();

    const result = await deleteCommentAsAdmin(replyComment._id.toString());

    expect(result.success).toBe(true);
    const deletedReply = await CommentModel.findById(replyComment._id);
    expect(deletedReply).toBeNull();

    const stillExistingParent = await CommentModel.findById(parentComment._id);
    expect(stillExistingParent).toBeDefined();
  });

  it("should handle comment with minimal populated data", async () => {
    (emailService.sendCommentDeletionWarning as jest.Mock).mockResolvedValue(
      undefined
    );

    const minimalComment = new CommentModel({
      user: user._id,
      event: event._id,
      content: "Minimal comment",
    });
    await minimalComment.save();

    const result = await deleteCommentAsAdmin(minimalComment._id.toString());

    expect(result.success).toBe(true);
    expect(result.data?.deletedCommentId).toBe(minimalComment._id.toString());
  });
});
