import { apiFetch } from "@/lib/api-client";
import type { VendorPoll } from "@/lib/types";

interface PollsResponse {
  success: boolean;
  message: string;
  polls?: Array<{
    id: string;
    boothName: string;
    durations: Array<{ start: string; end: string }>;
    vendors: Array<{
      vendorId: string;
      vendorName: string;
      votes: number;
      logo?: string;
    }>;
    totalVotes: number;
    selectedVendorId?: string;
  }>;
}

interface VoteResponse {
  success: boolean;
  message: string;
}

interface CreatePollResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface CreateVendorPollInput {
  boothName: string;
  durations: Array<{ start: string; end: string }>;
  vendorIds: string[];
}

export async function fetchVendorPolls(token?: string): Promise<VendorPoll[]> {
  const response = await apiFetch<PollsResponse>("/polls", {
    method: "GET",
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to load vendor polls");
  }

  return (response.polls ?? []).map((poll) => ({
    id: poll.id,
    boothName: poll.boothName,
    durations: poll.durations,
    options: poll.vendors.map((vendor) => ({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      votes: vendor.votes,
      logo: vendor.logo,
    })),
    totalVotes: poll.totalVotes,
    selectedVendorId: poll.selectedVendorId,
  }));
}

export async function voteForVendorPoll(pollId: string, vendorId: string, token?: string) {
  const response = await apiFetch<VoteResponse, { vendorId: string }>(`/polls/${pollId}/vote`, {
    method: "POST",
    body: { vendorId },
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to submit vote");
  }

  return response.message;
}

export async function createVendorPoll(data: CreateVendorPollInput, token?: string) {
  const response = await apiFetch<CreatePollResponse, CreateVendorPollInput>("/admin/polls", {
    method: "POST",
    body: data,
    token,
  });

  if (!response.success) {
    throw new Error(response.message ?? "Failed to create poll");
  }

  return response;
}
