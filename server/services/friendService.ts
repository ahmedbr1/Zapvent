import { Types } from "mongoose";
import UserModel, {
  IUser,
  IFriendRequest,
  FriendRequestStatus,
  userRole,
} from "../models/User";

// ============ Types ============

export interface FriendSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface FriendRequestSummary {
  odId: string;
  odName: string;
  status: FriendRequestStatus;
  createdAt: Date;
}

export interface FriendsAttendingEvent {
  eventId: string;
  friends: Array<{ id: string; name: string }>;
}

interface ServiceResponse<T = undefined> {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
}

// ============ Helper Functions ============

function getUserName(user: Pick<IUser, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

// ============ Send Friend Request ============

export async function sendFriendRequest(
  senderId: string,
  receiverId: string
): Promise<ServiceResponse> {
  if (
    !Types.ObjectId.isValid(senderId) ||
    !Types.ObjectId.isValid(receiverId)
  ) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  if (senderId === receiverId) {
    return {
      success: false,
      message: "You cannot send a friend request to yourself.",
      statusCode: 400,
    };
  }

  const [sender, receiver] = await Promise.all([
    UserModel.findById(senderId).lean<IUser & { _id: Types.ObjectId }>(),
    UserModel.findById(receiverId).lean<IUser & { _id: Types.ObjectId }>(),
  ]);

  if (!sender || !receiver) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  // Only students can have friends (based on requirement)
  if (sender.role !== userRole.STUDENT || receiver.role !== userRole.STUDENT) {
    return {
      success: false,
      message: "Friend requests are only available for students.",
      statusCode: 400,
    };
  }

  // Check if already friends
  if (sender.friends?.some((f) => f.toString() === receiverId)) {
    return {
      success: false,
      message: "You are already friends with this user.",
      statusCode: 400,
    };
  }

  // Check if request already sent
  if (
    sender.friendRequestsSent?.some(
      (r) =>
        r.odId.toString() === receiverId &&
        r.status === FriendRequestStatus.PENDING
    )
  ) {
    return {
      success: false,
      message: "Friend request already sent.",
      statusCode: 400,
    };
  }

  // Check if there's a pending request from receiver
  if (
    sender.friendRequestsReceived?.some(
      (r) =>
        r.odId.toString() === receiverId &&
        r.status === FriendRequestStatus.PENDING
    )
  ) {
    return {
      success: false,
      message:
        "This user has already sent you a friend request. Accept it instead.",
      statusCode: 400,
    };
  }

  const senderName = getUserName(sender);
  const receiverName = getUserName(receiver);
  const now = new Date();

  // Add to sender's sent requests
  await UserModel.findByIdAndUpdate(senderId, {
    $push: {
      friendRequestsSent: {
        odId: new Types.ObjectId(receiverId),
        odName: receiverName,
        status: FriendRequestStatus.PENDING,
        createdAt: now,
      },
    },
  });

  // Add to receiver's received requests
  await UserModel.findByIdAndUpdate(receiverId, {
    $push: {
      friendRequestsReceived: {
        odId: new Types.ObjectId(senderId),
        odName: senderName,
        status: FriendRequestStatus.PENDING,
        createdAt: now,
      },
      notifications: {
        message: `${senderName} sent you a friend request.`,
        seen: false,
        createdAt: now,
      },
    },
  });

  return { success: true, message: "Friend request sent successfully." };
}

// ============ Accept Friend Request ============

export async function acceptFriendRequest(
  userId: string,
  senderId: string
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(senderId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  // Find pending request
  const requestIndex =
    user.friendRequestsReceived?.findIndex(
      (r: IFriendRequest) =>
        r.odId.toString() === senderId &&
        r.status === FriendRequestStatus.PENDING
    ) ?? -1;

  if (requestIndex < 0) {
    return {
      success: false,
      message: "Friend request not found.",
      statusCode: 404,
    };
  }

  const sender = await UserModel.findById(senderId);
  if (!sender) {
    return { success: false, message: "Sender not found.", statusCode: 404 };
  }

  const userName = getUserName(user);

  // Update user's received request status and add to friends
  user.friendRequestsReceived![requestIndex].status =
    FriendRequestStatus.ACCEPTED;
  user.friends = user.friends ?? [];
  user.friends.push(new Types.ObjectId(senderId));
  await user.save();

  // Update sender's sent request status and add to friends
  await UserModel.findByIdAndUpdate(
    senderId,
    {
      $set: {
        "friendRequestsSent.$[elem].status": FriendRequestStatus.ACCEPTED,
      },
      $push: {
        friends: new Types.ObjectId(userId),
        notifications: {
          message: `${userName} accepted your friend request.`,
          seen: false,
          createdAt: new Date(),
        },
      },
    },
    {
      arrayFilters: [{ "elem.odId": new Types.ObjectId(userId) }],
    }
  );

  return { success: true, message: "Friend request accepted." };
}

// ============ Reject Friend Request ============

export async function rejectFriendRequest(
  userId: string,
  senderId: string
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(senderId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  const requestIndex =
    user.friendRequestsReceived?.findIndex(
      (r: IFriendRequest) =>
        r.odId.toString() === senderId &&
        r.status === FriendRequestStatus.PENDING
    ) ?? -1;

  if (requestIndex < 0) {
    return {
      success: false,
      message: "Friend request not found.",
      statusCode: 404,
    };
  }

  // Update status to rejected
  user.friendRequestsReceived![requestIndex].status =
    FriendRequestStatus.REJECTED;
  await user.save();

  // Update sender's request status
  await UserModel.findByIdAndUpdate(
    senderId,
    {
      $set: {
        "friendRequestsSent.$[elem].status": FriendRequestStatus.REJECTED,
      },
    },
    {
      arrayFilters: [{ "elem.odId": new Types.ObjectId(userId) }],
    }
  );

  return { success: true, message: "Friend request rejected." };
}

// ============ Remove Friend ============

export async function removeFriend(
  userId: string,
  friendId: string
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(friendId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  // Check if they are friends
  if (!user.friends?.some((f: Types.ObjectId) => f.toString() === friendId)) {
    return {
      success: false,
      message: "This user is not your friend.",
      statusCode: 400,
    };
  }

  // Remove from both users' friend lists
  await Promise.all([
    UserModel.findByIdAndUpdate(userId, {
      $pull: { friends: new Types.ObjectId(friendId) },
    }),
    UserModel.findByIdAndUpdate(friendId, {
      $pull: { friends: new Types.ObjectId(userId) },
    }),
  ]);

  return { success: true, message: "Friend removed successfully." };
}

// ============ Cancel Sent Friend Request ============

export async function cancelFriendRequest(
  userId: string,
  receiverId: string
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(receiverId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  // Remove from sender's sent requests
  await UserModel.findByIdAndUpdate(userId, {
    $pull: {
      friendRequestsSent: {
        odId: new Types.ObjectId(receiverId),
        status: FriendRequestStatus.PENDING,
      },
    },
  });

  // Remove from receiver's received requests
  await UserModel.findByIdAndUpdate(receiverId, {
    $pull: {
      friendRequestsReceived: {
        odId: new Types.ObjectId(userId),
        status: FriendRequestStatus.PENDING,
      },
    },
  });

  return { success: true, message: "Friend request cancelled." };
}

// ============ Get Friends List ============

export async function getFriendsList(
  userId: string
): Promise<ServiceResponse<FriendSummary[]>> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId)
    .populate<{
      friends: Array<IUser & { _id: Types.ObjectId }>;
    }>("friends", "firstName lastName email role")
    .lean();

  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  const friendsArray =
    (user as unknown as { friends: Array<IUser & { _id: Types.ObjectId }> })
      .friends ?? [];
  const friends = friendsArray.map((f) => ({
    id: f._id.toString(),
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    role: f.role,
  }));

  return {
    success: true,
    message: "Friends list retrieved successfully.",
    data: friends,
  };
}

// ============ Get Pending Friend Requests ============

export async function getPendingFriendRequests(
  userId: string
): Promise<
  ServiceResponse<{
    received: FriendRequestSummary[];
    sent: FriendRequestSummary[];
  }>
> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId)
    .select("friendRequestsReceived friendRequestsSent")
    .lean<IUser>();

  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  const received = (user.friendRequestsReceived ?? [])
    .filter((r) => r.status === FriendRequestStatus.PENDING)
    .map((r) => ({
      odId: r.odId.toString(),
      odName: r.odName,
      status: r.status,
      createdAt: r.createdAt,
    }));

  const sent = (user.friendRequestsSent ?? [])
    .filter((r) => r.status === FriendRequestStatus.PENDING)
    .map((r) => ({
      odId: r.odId.toString(),
      odName: r.odName,
      status: r.status,
      createdAt: r.createdAt,
    }));

  return {
    success: true,
    message: "Friend requests retrieved successfully.",
    data: { received, sent },
  };
}

// ============ Get Friends Attending Event ============

export async function getFriendsAttendingEvent(
  userId: string,
  eventId: string
): Promise<ServiceResponse<Array<{ id: string; name: string }>>> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId).select("friends").lean<IUser>();

  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  if (!user.friends || user.friends.length === 0) {
    return { success: true, message: "No friends found.", data: [] };
  }

  // Get friends who are registered for this event AND have not hidden their attendance
  const friendsAttending = await UserModel.find({
    _id: { $in: user.friends },
    registeredEvents: eventId,
    $or: [
      { "privacySettings.hideEventAttendance": { $ne: true } },
      { privacySettings: { $exists: false } },
    ],
  })
    .select("firstName lastName")
    .lean<
      Array<{ _id: Types.ObjectId; firstName: string; lastName: string }>
    >();

  return {
    success: true,
    message: "Friends attending retrieved successfully.",
    data: friendsAttending.map((f) => ({
      id: f._id.toString(),
      name: `${f.firstName} ${f.lastName}`.trim(),
    })),
  };
}

// ============ Get Friends Attending Multiple Events ============

export async function getFriendsAttendingEvents(
  userId: string,
  eventIds: string[]
): Promise<
  ServiceResponse<Record<string, Array<{ id: string; name: string }>>>
> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const user = await UserModel.findById(userId).select("friends").lean<IUser>();

  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  if (!user.friends || user.friends.length === 0) {
    return { success: true, message: "No friends found.", data: {} };
  }

  // Get all friends with their registered events (only those not hiding attendance)
  const friends = await UserModel.find({
    _id: { $in: user.friends },
    $or: [
      { "privacySettings.hideEventAttendance": { $ne: true } },
      { privacySettings: { $exists: false } },
    ],
  })
    .select("firstName lastName registeredEvents")
    .lean<
      Array<{
        _id: Types.ObjectId;
        firstName: string;
        lastName: string;
        registeredEvents?: string[];
      }>
    >();

  const result: Record<string, Array<{ id: string; name: string }>> = {};

  for (const eventId of eventIds) {
    result[eventId] = friends
      .filter((f) => f.registeredEvents?.includes(eventId))
      .map((f) => ({
        id: f._id.toString(),
        name: `${f.firstName} ${f.lastName}`.trim(),
      }));
  }

  return {
    success: true,
    message: "Friends attending retrieved successfully.",
    data: result,
  };
}

// ============ Update Privacy Settings ============

export async function updatePrivacySettings(
  userId: string,
  settings: { hideEventAttendance?: boolean }
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(userId)) {
    return { success: false, message: "Invalid user ID.", statusCode: 400 };
  }

  const updateObj: Record<string, boolean> = {};
  if (settings.hideEventAttendance !== undefined) {
    updateObj["privacySettings.hideEventAttendance"] =
      settings.hideEventAttendance;
  }

  if (Object.keys(updateObj).length === 0) {
    return {
      success: false,
      message: "No settings to update.",
      statusCode: 400,
    };
  }

  const result = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updateObj },
    { new: true }
  );
  if (!result) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  return { success: true, message: "Privacy settings updated successfully." };
}

// ============ Search Students ============

export async function searchStudents(
  query: string,
  excludeUserId: string,
  limit: number = 20
): Promise<ServiceResponse<FriendSummary[]>> {
  if (!query?.trim()) {
    return {
      success: false,
      message: "Search query is required.",
      statusCode: 400,
    };
  }

  const searchRegex = new RegExp(query.trim(), "i");

  const students = await UserModel.find({
    _id: { $ne: new Types.ObjectId(excludeUserId) },
    role: userRole.STUDENT,
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { studentId: searchRegex },
    ],
  })
    .select("firstName lastName email role")
    .limit(limit)
    .lean<Array<IUser & { _id: Types.ObjectId }>>();

  return {
    success: true,
    message: "Students found.",
    data: students.map((s) => ({
      id: s._id.toString(),
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      role: s.role,
    })),
  };
}
