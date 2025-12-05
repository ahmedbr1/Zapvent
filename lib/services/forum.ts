import { apiFetch } from "@/lib/api-client";

// ============ Types ============

export enum ForumPostStatus {
  OPEN = "open",
  CLOSED = "closed",
  PINNED = "pinned",
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
  createdAt: string;
  updatedAt?: string;
}

export interface ForumComment {
  id: string;
  authorId: string;
  authorType: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ForumAnswer {
  id: string;
  authorId: string;
  authorType: string;
  authorName: string;
  content: string;
  voteCount: number;
  isAccepted: boolean;
  comments: ForumComment[];
  createdAt: string;
  updatedAt?: string;
  userVote?: 1 | -1 | null;
}

export interface ForumPostDetail extends ForumPostSummary {
  answers: ForumAnswer[];
  userVote?: 1 | -1 | null;
}

export interface ForumPostsResponse {
  success: boolean;
  data?: {
    posts: ForumPostSummary[];
    total: number;
    page: number;
    limit: number;
  };
  message?: string;
}

export interface ForumPostResponse {
  success: boolean;
  data?: ForumPostDetail;
  message?: string;
}

export interface ForumTagsResponse {
  success: boolean;
  data?: Array<{ tag: string; count: number }>;
  message?: string;
}

export interface ForumVoteResponse {
  success: boolean;
  data?: { voteCount: number };
  message?: string;
}

export interface ForumAnswerResponse {
  success: boolean;
  data?: ForumAnswer;
  message?: string;
}

export interface ForumCommentResponse {
  success: boolean;
  data?: ForumComment;
  message?: string;
}

// ============ API Functions ============

export async function getForumPosts(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
    sortBy?: "newest" | "oldest" | "votes" | "unanswered";
    status?: ForumPostStatus;
  } = {},
  token?: string
): Promise<ForumPostsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.tags?.length) searchParams.set("tags", params.tags.join(","));
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.status) searchParams.set("status", params.status);

  const query = searchParams.toString();
  return apiFetch<ForumPostsResponse>(
    `/forum/posts${query ? `?${query}` : ""}`,
    { token }
  );
}

export async function getForumPost(
  postId: string,
  token?: string
): Promise<ForumPostResponse> {
  return apiFetch<ForumPostResponse>(`/forum/posts/${postId}`, { token });
}

export async function createForumPost(
  data: { title: string; content: string; tags?: string[] },
  token: string
): Promise<ForumPostResponse> {
  return apiFetch<ForumPostResponse>("/forum/posts", {
    method: "POST",
    body: data,
    token,
  });
}

export async function deleteForumPost(
  postId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function voteOnPost(
  postId: string,
  vote: 1 | -1,
  token: string
): Promise<ForumVoteResponse> {
  return apiFetch<ForumVoteResponse>(`/forum/posts/${postId}/vote`, {
    method: "POST",
    body: { vote },
    token,
  });
}

export async function createAnswer(
  postId: string,
  content: string,
  token: string
): Promise<ForumAnswerResponse> {
  return apiFetch<ForumAnswerResponse>(`/forum/posts/${postId}/answers`, {
    method: "POST",
    body: { content },
    token,
  });
}

export async function deleteAnswer(
  postId: string,
  answerId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}/answers/${answerId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function voteOnAnswer(
  postId: string,
  answerId: string,
  vote: 1 | -1,
  token: string
): Promise<ForumVoteResponse> {
  return apiFetch<ForumVoteResponse>(
    `/forum/posts/${postId}/answers/${answerId}/vote`,
    {
      method: "POST",
      body: { vote },
      token,
    }
  );
}

export async function acceptAnswer(
  postId: string,
  answerId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}/answers/${answerId}/accept`,
    {
      method: "POST",
      token,
    }
  );
}

export async function createComment(
  postId: string,
  answerId: string,
  content: string,
  token: string
): Promise<ForumCommentResponse> {
  return apiFetch<ForumCommentResponse>(
    `/forum/posts/${postId}/answers/${answerId}/comments`,
    {
      method: "POST",
      body: { content },
      token,
    }
  );
}

export async function deleteComment(
  postId: string,
  answerId: string,
  commentId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}/answers/${answerId}/comments/${commentId}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function getPopularTags(
  token?: string
): Promise<ForumTagsResponse> {
  return apiFetch<ForumTagsResponse>("/forum/tags", { token });
}

// Admin functions
export async function pinPost(
  postId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}/pin`,
    {
      method: "POST",
      token,
    }
  );
}

export async function closePost(
  postId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}/close`,
    {
      method: "POST",
      token,
    }
  );
}

export async function reopenPost(
  postId: string,
  token: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(
    `/forum/posts/${postId}/reopen`,
    {
      method: "POST",
      token,
    }
  );
}
