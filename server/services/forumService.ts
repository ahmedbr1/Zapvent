import { Types } from "mongoose";
import ForumPostModel, {
  IForumPost,
  IForumAnswer,
  IForumComment,
  IForumVote,
  ForumPostStatus,
} from "../models/ForumPost";

// ============ Types ============

export interface CreatePostInput {
  title: string;
  content: string;
  tags?: string[];
}

export interface CreateAnswerInput {
  content: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface ForumPostSummary {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorType: string;
  authorName: string;
  tags: string[];
  voteCount: number;
  answerCount: number;
  hasAcceptedAnswer: boolean;
  status: ForumPostStatus;
  viewCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ForumPostDetail extends ForumPostSummary {
  answers: ForumAnswerDetail[];
  userVote?: 1 | -1 | null;
}

export interface ForumAnswerDetail {
  id: string;
  authorId: string;
  authorType: string;
  authorName: string;
  content: string;
  voteCount: number;
  isAccepted: boolean;
  comments: ForumCommentDetail[];
  createdAt: Date;
  updatedAt?: Date;
  userVote?: 1 | -1 | null;
}

export interface ForumCommentDetail {
  id: string;
  authorId: string;
  authorType: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

interface ServiceResponse<T = undefined> {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
}

// ============ Helper Functions ============

function serializePost(
  post: IForumPost & { _id: Types.ObjectId },
  userId?: string,
  userType?: string
): ForumPostDetail {
  const userVote =
    userId && userType
      ? (post.votes.find(
          (v) => v.odId.toString() === userId && v.odType === userType
        )?.vote ?? null)
      : null;

  return {
    id: post._id.toString(),
    title: post.title,
    content: post.content,
    authorId: post.authorId.toString(),
    authorType: post.authorType,
    authorName: post.authorName,
    tags: post.tags,
    voteCount: post.voteCount,
    answerCount: post.answerCount,
    hasAcceptedAnswer: !!post.acceptedAnswerId,
    status: post.status,
    viewCount: post.viewCount,
    createdAt: post.createdAt!,
    updatedAt: post.updatedAt,
    userVote,
    answers: post.answers.map((answer) =>
      serializeAnswer(answer, userId, userType)
    ),
  };
}

function serializeAnswer(
  answer: IForumAnswer & { _id?: Types.ObjectId },
  userId?: string,
  userType?: string
): ForumAnswerDetail {
  const userVote =
    userId && userType
      ? (answer.votes.find(
          (v) => v.odId.toString() === userId && v.odType === userType
        )?.vote ?? null)
      : null;

  return {
    id: answer._id?.toString() ?? "",
    authorId: answer.authorId.toString(),
    authorType: answer.authorType,
    authorName: answer.authorName,
    content: answer.content,
    voteCount: answer.voteCount,
    isAccepted: answer.isAccepted,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
    userVote,
    comments: answer.comments.map(serializeComment),
  };
}

function serializeComment(
  comment: IForumComment & { _id?: Types.ObjectId }
): ForumCommentDetail {
  return {
    id: comment._id?.toString() ?? "",
    authorId: comment.authorId.toString(),
    authorType: comment.authorType,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

function serializePostSummary(
  post: IForumPost & { _id: Types.ObjectId }
): ForumPostSummary {
  return {
    id: post._id.toString(),
    title: post.title,
    content:
      post.content.slice(0, 200) + (post.content.length > 200 ? "..." : ""),
    authorId: post.authorId.toString(),
    authorType: post.authorType,
    authorName: post.authorName,
    tags: post.tags,
    voteCount: post.voteCount,
    answerCount: post.answerCount,
    hasAcceptedAnswer: !!post.acceptedAnswerId,
    status: post.status,
    viewCount: post.viewCount,
    createdAt: post.createdAt!,
    updatedAt: post.updatedAt,
  };
}

// ============ Post Operations ============

export async function createPost(
  authorId: string,
  authorType: "User" | "Vendor" | "Admin",
  authorName: string,
  input: CreatePostInput
): Promise<ServiceResponse<ForumPostSummary>> {
  if (!input.title?.trim()) {
    return { success: false, message: "Title is required.", statusCode: 400 };
  }
  if (!input.content?.trim()) {
    return { success: false, message: "Content is required.", statusCode: 400 };
  }
  if (input.title.length > 200) {
    return {
      success: false,
      message: "Title cannot exceed 200 characters.",
      statusCode: 400,
    };
  }
  if (input.content.length > 10000) {
    return {
      success: false,
      message: "Content cannot exceed 10000 characters.",
      statusCode: 400,
    };
  }

  const tags = (input.tags ?? [])
    .slice(0, 5)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const post = new ForumPostModel({
    title: input.title.trim(),
    content: input.content.trim(),
    authorId: new Types.ObjectId(authorId),
    authorType,
    authorName,
    tags,
  });

  await post.save();

  return {
    success: true,
    message: "Post created successfully.",
    data: serializePostSummary(
      post.toObject() as IForumPost & { _id: Types.ObjectId }
    ),
  };
}

export async function getPosts(
  page: number = 1,
  limit: number = 20,
  sortBy: "recent" | "votes" | "unanswered" = "recent",
  tag?: string,
  search?: string
): Promise<
  ServiceResponse<{
    posts: ForumPostSummary[];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  const query: Record<string, unknown> = {};

  if (tag) {
    query.tags = tag.toLowerCase();
  }

  if (search) {
    query.$text = { $search: search };
  }

  let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
  if (sortBy === "votes") {
    sortOption = { voteCount: -1, createdAt: -1 };
  } else if (sortBy === "unanswered") {
    query.answerCount = 0;
    sortOption = { createdAt: -1 };
  }

  const skip = (page - 1) * limit;
  const [posts, total] = await Promise.all([
    ForumPostModel.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean<Array<IForumPost & { _id: Types.ObjectId }>>(),
    ForumPostModel.countDocuments(query),
  ]);

  return {
    success: true,
    message: "Posts retrieved successfully.",
    data: {
      posts: posts.map(serializePostSummary),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPostById(
  postId: string,
  userId?: string,
  userType?: string
): Promise<ServiceResponse<ForumPostDetail>> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findByIdAndUpdate(
    postId,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean<(IForumPost & { _id: Types.ObjectId }) | null>();

  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  return {
    success: true,
    message: "Post retrieved successfully.",
    data: serializePost(post, userId, userType),
  };
}

export async function deletePost(
  postId: string,
  userId: string,
  userType: "User" | "Vendor" | "Admin",
  isAdmin: boolean = false
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  // Only author or admin can delete
  const isAuthor =
    post.authorId.toString() === userId && post.authorType === userType;
  if (!isAuthor && !isAdmin) {
    return {
      success: false,
      message: "You are not authorized to delete this post.",
      statusCode: 403,
    };
  }

  await ForumPostModel.findByIdAndDelete(postId);

  return { success: true, message: "Post deleted successfully." };
}

// ============ Vote Operations ============

export async function voteOnPost(
  postId: string,
  userId: string,
  userType: "User" | "Vendor" | "Admin",
  vote: 1 | -1
): Promise<ServiceResponse<{ voteCount: number }>> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  const odId = new Types.ObjectId(userId);
  const existingVoteIndex = post.votes.findIndex(
    (v: IForumVote) => v.odId.toString() === userId && v.odType === userType
  );

  if (existingVoteIndex >= 0) {
    const existingVote = post.votes[existingVoteIndex];
    if (existingVote.vote === vote) {
      // Remove vote (toggle off)
      post.votes.splice(existingVoteIndex, 1);
      post.voteCount -= vote;
    } else {
      // Change vote
      post.votes[existingVoteIndex].vote = vote;
      post.voteCount += vote * 2; // -1 to +1 = +2, +1 to -1 = -2
    }
  } else {
    // New vote
    post.votes.push({ odId, odType: userType, vote });
    post.voteCount += vote;
  }

  await post.save();

  return {
    success: true,
    message: "Vote recorded successfully.",
    data: { voteCount: post.voteCount },
  };
}

// ============ Answer Operations ============

export async function createAnswer(
  postId: string,
  authorId: string,
  authorType: "User" | "Vendor" | "Admin",
  authorName: string,
  input: CreateAnswerInput
): Promise<ServiceResponse<ForumAnswerDetail>> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }
  if (!input.content?.trim()) {
    return { success: false, message: "Content is required.", statusCode: 400 };
  }
  if (input.content.length > 10000) {
    return {
      success: false,
      message: "Content cannot exceed 10000 characters.",
      statusCode: 400,
    };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  if (post.status === ForumPostStatus.CLOSED) {
    return {
      success: false,
      message: "This post is closed for new answers.",
      statusCode: 400,
    };
  }

  const answer: IForumAnswer = {
    _id: new Types.ObjectId(),
    authorId: new Types.ObjectId(authorId),
    authorType,
    authorName,
    content: input.content.trim(),
    votes: [],
    voteCount: 0,
    isAccepted: false,
    comments: [],
    createdAt: new Date(),
  };

  post.answers.push(answer);
  post.answerCount = post.answers.length;
  await post.save();

  return {
    success: true,
    message: "Answer posted successfully.",
    data: serializeAnswer(answer),
  };
}

export async function voteOnAnswer(
  postId: string,
  answerId: string,
  userId: string,
  userType: "User" | "Vendor" | "Admin",
  vote: 1 | -1
): Promise<ServiceResponse<{ voteCount: number }>> {
  if (!Types.ObjectId.isValid(postId) || !Types.ObjectId.isValid(answerId)) {
    return { success: false, message: "Invalid ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  const answer = post.answers.find(
    (a: IForumAnswer) => a._id?.toString() === answerId
  );
  if (!answer) {
    return { success: false, message: "Answer not found.", statusCode: 404 };
  }

  const odId = new Types.ObjectId(userId);
  const existingVoteIndex = answer.votes.findIndex(
    (v: IForumVote) => v.odId.toString() === userId && v.odType === userType
  );

  if (existingVoteIndex >= 0) {
    const existingVote = answer.votes[existingVoteIndex];
    if (existingVote.vote === vote) {
      answer.votes.splice(existingVoteIndex, 1);
      answer.voteCount -= vote;
    } else {
      answer.votes[existingVoteIndex].vote = vote;
      answer.voteCount += vote * 2;
    }
  } else {
    answer.votes.push({ odId, odType: userType, vote });
    answer.voteCount += vote;
  }

  await post.save();

  return {
    success: true,
    message: "Vote recorded successfully.",
    data: { voteCount: answer.voteCount },
  };
}

export async function acceptAnswer(
  postId: string,
  answerId: string,
  userId: string,
  userType: "User" | "Vendor" | "Admin"
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(postId) || !Types.ObjectId.isValid(answerId)) {
    return { success: false, message: "Invalid ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  // Only post author can accept
  if (post.authorId.toString() !== userId || post.authorType !== userType) {
    return {
      success: false,
      message: "Only the post author can accept an answer.",
      statusCode: 403,
    };
  }

  const answer = post.answers.find(
    (a: IForumAnswer) => a._id?.toString() === answerId
  );
  if (!answer) {
    return { success: false, message: "Answer not found.", statusCode: 404 };
  }

  // Unaccept previously accepted answer
  post.answers.forEach((a: IForumAnswer) => {
    a.isAccepted = false;
  });

  answer.isAccepted = true;
  post.acceptedAnswerId = answer._id;
  await post.save();

  return { success: true, message: "Answer accepted successfully." };
}

export async function deleteAnswer(
  postId: string,
  answerId: string,
  userId: string,
  userType: "User" | "Vendor" | "Admin",
  isAdmin: boolean = false
): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(postId) || !Types.ObjectId.isValid(answerId)) {
    return { success: false, message: "Invalid ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  const answerIndex = post.answers.findIndex(
    (a: IForumAnswer) => a._id?.toString() === answerId
  );
  if (answerIndex < 0) {
    return { success: false, message: "Answer not found.", statusCode: 404 };
  }

  const answer = post.answers[answerIndex];
  const isAuthor =
    answer.authorId.toString() === userId && answer.authorType === userType;
  if (!isAuthor && !isAdmin) {
    return {
      success: false,
      message: "You are not authorized to delete this answer.",
      statusCode: 403,
    };
  }

  if (post.acceptedAnswerId?.toString() === answerId) {
    post.acceptedAnswerId = undefined;
  }

  post.answers.splice(answerIndex, 1);
  post.answerCount = post.answers.length;
  await post.save();

  return { success: true, message: "Answer deleted successfully." };
}

// ============ Comment Operations ============

export async function createComment(
  postId: string,
  answerId: string,
  authorId: string,
  authorType: "User" | "Vendor" | "Admin",
  authorName: string,
  input: CreateCommentInput
): Promise<ServiceResponse<ForumCommentDetail>> {
  if (!Types.ObjectId.isValid(postId) || !Types.ObjectId.isValid(answerId)) {
    return { success: false, message: "Invalid ID.", statusCode: 400 };
  }
  if (!input.content?.trim()) {
    return { success: false, message: "Content is required.", statusCode: 400 };
  }
  if (input.content.length > 1000) {
    return {
      success: false,
      message: "Comment cannot exceed 1000 characters.",
      statusCode: 400,
    };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  const answer = post.answers.find(
    (a: IForumAnswer) => a._id?.toString() === answerId
  );
  if (!answer) {
    return { success: false, message: "Answer not found.", statusCode: 404 };
  }

  const comment: IForumComment = {
    _id: new Types.ObjectId(),
    authorId: new Types.ObjectId(authorId),
    authorType,
    authorName,
    content: input.content.trim(),
    createdAt: new Date(),
  };

  answer.comments.push(comment);
  await post.save();

  return {
    success: true,
    message: "Comment posted successfully.",
    data: serializeComment(comment),
  };
}

export async function deleteComment(
  postId: string,
  answerId: string,
  commentId: string,
  userId: string,
  userType: "User" | "Vendor" | "Admin",
  isAdmin: boolean = false
): Promise<ServiceResponse> {
  if (
    !Types.ObjectId.isValid(postId) ||
    !Types.ObjectId.isValid(answerId) ||
    !Types.ObjectId.isValid(commentId)
  ) {
    return { success: false, message: "Invalid ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findById(postId);
  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  const answer = post.answers.find(
    (a: IForumAnswer) => a._id?.toString() === answerId
  );
  if (!answer) {
    return { success: false, message: "Answer not found.", statusCode: 404 };
  }

  const commentIndex = answer.comments.findIndex(
    (c: IForumComment) => c._id?.toString() === commentId
  );
  if (commentIndex < 0) {
    return { success: false, message: "Comment not found.", statusCode: 404 };
  }

  const comment = answer.comments[commentIndex];
  const isAuthor =
    comment.authorId.toString() === userId && comment.authorType === userType;
  if (!isAuthor && !isAdmin) {
    return {
      success: false,
      message: "You are not authorized to delete this comment.",
      statusCode: 403,
    };
  }

  answer.comments.splice(commentIndex, 1);
  await post.save();

  return { success: true, message: "Comment deleted successfully." };
}

// ============ Moderation (Admin) ============

export async function pinPost(postId: string): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findByIdAndUpdate(
    postId,
    { status: ForumPostStatus.PINNED },
    { new: true }
  );

  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  return { success: true, message: "Post pinned successfully." };
}

export async function closePost(postId: string): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findByIdAndUpdate(
    postId,
    { status: ForumPostStatus.CLOSED },
    { new: true }
  );

  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  return { success: true, message: "Post closed successfully." };
}

export async function reopenPost(postId: string): Promise<ServiceResponse> {
  if (!Types.ObjectId.isValid(postId)) {
    return { success: false, message: "Invalid post ID.", statusCode: 400 };
  }

  const post = await ForumPostModel.findByIdAndUpdate(
    postId,
    { status: ForumPostStatus.OPEN },
    { new: true }
  );

  if (!post) {
    return { success: false, message: "Post not found.", statusCode: 404 };
  }

  return { success: true, message: "Post reopened successfully." };
}

export async function getPopularTags(
  limit: number = 20
): Promise<ServiceResponse<{ tag: string; count: number }[]>> {
  const result = await ForumPostModel.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { tag: "$_id", count: 1, _id: 0 } },
  ]);

  return {
    success: true,
    message: "Tags retrieved successfully.",
    data: result,
  };
}
