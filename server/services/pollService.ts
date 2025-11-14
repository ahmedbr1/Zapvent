import { Types, isValidObjectId } from "mongoose";
import PollModel, { IDurationRange } from "../models/Poll";
import VendorModel, { VendorStatus } from "../models/Vendor";

type DurationInput = {
  start: string;
  end: string;
};

export interface CreateVendorBoothPollInput {
  boothName: string;
  durations: DurationInput[];
  vendorIds: string[];
}

function parseDuration(duration: DurationInput): IDurationRange | null {
  if (!duration?.start || !duration?.end) {
    return null;
  }
  const startDate = new Date(duration.start);
  const endDate = new Date(duration.end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  if (startDate >= endDate) {
    return null;
  }
  return {
    start: startDate,
    end: endDate,
  };
}

export async function createVendorBoothPoll(input: CreateVendorBoothPollInput) {
  try {
    const boothName = input.boothName?.trim();
    if (!boothName) {
      return {
        success: false,
        statusCode: 400,
        message: "boothName is required",
      };
    }

    if (!Array.isArray(input.durations) || input.durations.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "At least one duration range is required",
      };
    }

    const normalizedDurations: IDurationRange[] = [];
    for (const duration of input.durations) {
      const parsed = parseDuration(duration);
      if (!parsed) {
        return {
          success: false,
          statusCode: 400,
          message: "Each duration must include valid ISO dates with start < end",
        };
      }
      normalizedDurations.push(parsed);
    }

    if (!Array.isArray(input.vendorIds) || input.vendorIds.length < 2) {
      return {
        success: false,
        statusCode: 400,
        message: "Provide at least two vendors to compare",
      };
    }

    const uniqueVendorIds = Array.from(new Set(input.vendorIds));
    const invalidVendor = uniqueVendorIds.find((id) => !isValidObjectId(id));
    if (invalidVendor) {
      return {
        success: false,
        statusCode: 400,
        message: `Invalid vendor id: ${invalidVendor}`,
      };
    }

    const vendors = await VendorModel.find({
      _id: { $in: uniqueVendorIds },
      verificationStatus: VendorStatus.APPROVED,
    }).select(["_id", "companyName"]);

    if (vendors.length !== uniqueVendorIds.length) {
      return {
        success: false,
        statusCode: 404,
        message: "One or more vendors were not found or not approved",
      };
    }

    const poll = await PollModel.create({
      boothName,
      durations: normalizedDurations,
      vendorsWithVotes: vendors.map((vendor) => ({ vendor: vendor._id, votes: 0 })),
    });

    return {
      success: true,
      statusCode: 201,
      data: {
        poll,
      },
    };
  } catch (error) {
    console.error("Error creating vendor booth poll:", error);
    return {
      success: false,
      statusCode: 500,
      message: "Failed to create poll",
    };
  }
}

export async function voteForVendor(
  pollId: string,
  userId: string,
  vendorId: string
) {
  try {
    if (!isValidObjectId(pollId)) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid poll id",
      };
    }

    if (!isValidObjectId(userId)) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid user id",
      };
    }

    if (!isValidObjectId(vendorId)) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid vendor id",
      };
    }

    const poll = await PollModel.findById(pollId);
    if (!poll) {
      return {
        success: false,
        statusCode: 404,
        message: "Poll not found",
      };
    }

    const vendorEntry = poll.vendorsWithVotes.find((entry) =>
      entry.vendor.equals(vendorId)
    );
    if (!vendorEntry) {
      return {
        success: false,
        statusCode: 400,
        message: "Selected vendor is not part of this poll",
      };
    }

    const userObjectId = new Types.ObjectId(userId);

    poll.votesByUser = poll.votesByUser ?? [];
    const previousVote = poll.votesByUser.find((vote) =>
      vote.user.equals(userObjectId)
    );

    if (previousVote) {
      // If the user votes for the same vendor again, no changes.
      if (previousVote.vendor.equals(vendorId)) {
        return {
          success: true,
          statusCode: 200,
          message: "Vote recorded",
          data: { poll },
        };
      }

      // decrement the old vendor vote count
      const oldVendorEntry = poll.vendorsWithVotes.find((entry) =>
        entry.vendor.equals(previousVote.vendor)
      );
      if (oldVendorEntry && oldVendorEntry.votes > 0) {
        oldVendorEntry.votes -= 1;
      }
      previousVote.vendor = vendorEntry.vendor;
    } else {
      poll.votesByUser.push({ user: userObjectId, vendor: vendorEntry.vendor });
    }

    vendorEntry.votes += 1;
    await poll.save();

    return {
      success: true,
      statusCode: 200,
      message: "Vote recorded",
      data: { poll },
    };
  } catch (error) {
    console.error("Error voting for vendor:", error);
    return {
      success: false,
      statusCode: 500,
      message: "Failed to record vote",
    };
  }
}

export async function listVendorBoothPolls(userId?: string) {
  try {
    const polls = await PollModel.find()
      .sort({ createdAt: -1 })
      .populate("vendorsWithVotes.vendor", ["companyName", "logo"])
      .lean();

    const userObjectId =
      userId && isValidObjectId(userId) ? new Types.ObjectId(userId) : null;

    const normalized = polls.map((poll) => {
      const selectedVote = userObjectId
        ? poll.votesByUser?.find((vote) => vote.user.equals(userObjectId))
        : undefined;

      return {
        id: poll._id.toString(),
        boothName: poll.boothName,
        durations: poll.durations.map((duration) => ({
          start: duration.start.toISOString(),
          end: duration.end.toISOString(),
        })),
        vendors: poll.vendorsWithVotes.map((entry) => {
          const vendorDoc =
            typeof entry.vendor === "object" && "companyName" in entry.vendor
              ? (entry.vendor as { _id: Types.ObjectId; companyName?: string; logo?: string })
              : null;
          return {
            vendorId: vendorDoc ? vendorDoc._id.toString() : entry.vendor.toString(),
            vendorName: vendorDoc?.companyName ?? "Vendor",
            logo: vendorDoc?.logo,
            votes: entry.votes,
          };
        }),
        totalVotes: poll.vendorsWithVotes.reduce((sum, entry) => sum + entry.votes, 0),
        selectedVendorId: selectedVote ? selectedVote.vendor.toString() : undefined,
      };
    });

    return {
      success: true,
      polls: normalized,
    };
  } catch (error) {
    console.error("Error listing vendor polls:", error);
    return {
      success: false,
      message: "Failed to load vendor polls",
    };
  }
}
