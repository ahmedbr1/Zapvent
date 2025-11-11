import { Types } from "mongoose";
import EventModel, { EventType, IEvent } from "../models/Event";
import UserModel, { IUser } from "../models/User";
import UserPaymentModel, {
  PaymentMethod,
  IUserPayment,
} from "../models/UserPayment";
import { emailService } from "./emailService";

const DEFAULT_CURRENCY = process.env.EVENT_PAYMENT_CURRENCY || "EGP";

type ServiceResponse<T> = {
  success: boolean;
  message: string;
  statusCode?: number;
  data?: T;
};

export type PayByWalletInput = {
  paymentSource?: string;
  useWalletBalance?: boolean;
  cardLast4?: string;
};

export type PayByWalletData = {
  receiptNumber: string;
  method: PaymentMethod;
  walletPortion: number;
  cardPortion: number;
  amount: number;
  currency: string;
  eventId: string;
  eventName: string;
  balance: number;
  transactionReference: string;
};

export type CancelRegistrationData = {
  refundAmount: number;
  balance: number;
  refundReference: string;
  refundedAt: Date;
  eventId: string;
  eventName: string;
};

export type WalletRefundSummary = {
  balance: number;
  totalRefunded: number;
  refunds: Array<{
    eventId: string;
    eventName?: string;
    amount: number;
    refundedAt?: Date;
    receiptNumber: string;
    refundReference?: string;
  }>;
};

function isValidObjectId(id: string) {
  return Types.ObjectId.isValid(id);
}

type EventWithId = IEvent & { _id: Types.ObjectId };
type UserWithId = IUser & { _id: Types.ObjectId };

function normalizeCardType(
  value?: string
): "CreditCard" | "DebitCard" | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("credit")) return "CreditCard";
  if (normalized.includes("debit")) return "DebitCard";
  return undefined;
}

function generateReference(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function isDuplicateKeyError(
  error: unknown
): error is { code: number; keyValue?: Record<string, unknown> } {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: unknown }).code === 11000;
}

async function ensureEventAndUser(
  eventId: string,
  userId: string
): Promise<
  | { success: false; message: string; statusCode: number }
  | { success: true; event: EventWithId; user: UserWithId }
> {
  if (!isValidObjectId(eventId) || !isValidObjectId(userId)) {
    return {
      success: false,
      message: "Invalid event or user identifier.",
      statusCode: 400,
    };
  }

  const [event, user] = await Promise.all([
    EventModel.findById(eventId).lean<EventWithId | null>(),
    UserModel.findById(userId).lean<UserWithId | null>(),
  ]);

  if (!event) {
    return { success: false, message: "Event not found.", statusCode: 404 };
  }

  if (!user) {
    return { success: false, message: "User not found.", statusCode: 404 };
  }

  return { success: true, event, user };
}

function isRegistrationAllowed(event: IEvent) {
  return (
    event.eventType === EventType.WORKSHOP || event.eventType === EventType.TRIP
  );
}

function userIsRegistered(event: IEvent, userId: string) {
  const list = event.registeredUsers ?? [];
  return list.some((entry) => entry.toString() === userId.toString());
}

export async function payByWallet(
  eventId: string,
  userId: string,
  payload: PayByWalletInput = {}
): Promise<ServiceResponse<PayByWalletData>> {
  try {
    const resolved = await ensureEventAndUser(eventId, userId);
    if (!resolved.success) {
      return resolved;
    }

    const { event, user } = resolved;

    if (!isRegistrationAllowed(event)) {
      return {
        success: false,
        message: "Payments are only supported for workshops and trips.",
        statusCode: 400,
      };
    }

    if (!userIsRegistered(event, userId)) {
      return {
        success: false,
        message: "User is not registered for this event.",
        statusCode: 400,
      };
    }

    const priceRaw =
      typeof event.price === "number" && !Number.isNaN(event.price)
        ? event.price
        : 0;
    const price = Math.max(priceRaw, 0);

    const wantWallet =
      payload.useWalletBalance ??
      (!payload.paymentSource ||
        payload.paymentSource.toLowerCase() === "wallet");
    const walletBalance = Math.max(user.balance ?? 0, 0);

    const walletPortion =
      wantWallet && price > 0 ? Math.min(walletBalance, price) : 0;
    const remaining = Math.max(price - walletPortion, 0);

    const cardType = normalizeCardType(payload.paymentSource);

    if (remaining > 0 && !cardType) {
      return {
        success: false,
        message:
          "Insufficient wallet balance. Please specify credit or debit card payment.",
        statusCode: 400,
      };
    }

    const method: PaymentMethod =
      price === 0 || (remaining === 0 && walletPortion > 0)
        ? "Wallet"
        : walletPortion > 0 && remaining > 0
          ? "Mixed"
          : cardType ?? "CreditCard";

    const resolvedEventId = event._id.toString();

    const receiptNumber = generateReference("EVT");
    const transactionReference = generateReference("PAY");
    const paidAt = new Date();
    const sanitizedLast4 =
      cardType && payload.cardLast4
        ? payload.cardLast4.replace(/\D/g, "").slice(-4)
        : undefined;

    const paymentDoc = new UserPaymentModel({
      userId,
      eventId,
      amount: price,
      currency: DEFAULT_CURRENCY,
      method,
      walletPortion,
      cardPortion: remaining,
      cardType,
      cardLast4: sanitizedLast4,
      receiptNumber,
      paidAt,
      transactionReference,
    });

    try {
      await paymentDoc.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          success: false,
          message: "Payment already recorded for this event.",
          statusCode: 409,
        };
      }
      throw error;
    }

    let updatedUser: UserWithId | null = user;
    if (walletPortion > 0) {
      updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { balance: -walletPortion } },
        { new: true }
      ).lean<UserWithId | null>();
    }

    if (price > 0) {
      await EventModel.findByIdAndUpdate(eventId, {
        $inc: { revenue: price },
      });
    }

    try {
      await emailService.sendUserEventPaymentReceipt({
        recipientEmail: user.email,
        recipientName: `${user.firstName} ${user.lastName}`.trim(),
        eventName: event.name,
        eventType: event.eventType,
        amount: price,
        currency: DEFAULT_CURRENCY,
        walletPortion,
        cardPortion: remaining,
        method,
        receiptNumber,
        paidAt,
      });
    } catch (emailError) {
      console.error("Failed to send payment receipt email:", emailError);
    }

    return {
      success: true,
      message: "Payment completed successfully.",
      data: {
        receiptNumber,
        method,
        walletPortion,
        cardPortion: remaining,
        amount: price,
        currency: DEFAULT_CURRENCY,
        eventId: resolvedEventId,
        eventName: event.name,
        balance: updatedUser?.balance ?? 0,
        transactionReference,
      },
    };
  } catch (error) {
    console.error("payByWallet error:", error);
    return {
      success: false,
      message: "Failed to record payment.",
      statusCode: 500,
    };
  }
}

export async function cancelRegistrationAndRefund(
  eventId: string,
  userId: string
): Promise<ServiceResponse<CancelRegistrationData>> {
  try {
    if (!isValidObjectId(eventId) || !isValidObjectId(userId)) {
      return {
        success: false,
        message: "Invalid event or user identifier.",
        statusCode: 400,
      };
    }

    const payment = await UserPaymentModel.findOne({
      eventId,
      userId,
      status: "Paid",
    });

    if (!payment) {
      return {
        success: false,
        message: "No completed payment found for this registration.",
        statusCode: 404,
      };
    }

    const event = await EventModel.findById(eventId).lean<EventWithId | null>();
    if (!event) {
      return {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      };
    }

    const refundAmount = payment.amount ?? 0;
    const updateOps: Record<string, unknown> = {
      $pull: { registeredUsers: userId },
    };

    if (refundAmount > 0) {
      updateOps.$inc = { revenue: -refundAmount };
    }

    await EventModel.findByIdAndUpdate(eventId, updateOps);

    const pullOps: Record<string, unknown> = {
      registeredEvents: eventId,
    };

    if (event.eventType === EventType.WORKSHOP) {
      pullOps.workshops = eventId;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $pull: pullOps,
        ...(refundAmount > 0
          ? {
              $inc: { balance: refundAmount },
            }
          : {}),
      },
      { new: true }
    ).lean<UserWithId | null>();

    payment.status = "Refunded";
    payment.refundAmount = refundAmount;
    payment.refundedAt = new Date();
    payment.refundReference = generateReference("REF");
    await payment.save();

    return {
      success: true,
      message: "Registration cancelled and amount refunded to wallet.",
      data: {
        refundAmount,
        balance: updatedUser?.balance ?? 0,
        refundReference: payment.refundReference,
        refundedAt: payment.refundedAt ?? new Date(),
        eventId: event._id.toString(),
        eventName: event.name,
      },
    };
  } catch (error) {
    console.error("cancelRegistrationAndRefund error:", error);
    return {
      success: false,
      message: "Failed to cancel registration.",
      statusCode: 500,
    };
  }
}

export async function getWalletRefundSummary(
  userId: string
): Promise<ServiceResponse<WalletRefundSummary>> {
  try {
    if (!isValidObjectId(userId)) {
      return {
        success: false,
        message: "Invalid user identifier.",
        statusCode: 400,
      };
    }

    const user = await UserModel.findById(userId).select("balance");
    if (!user) {
      return {
        success: false,
        message: "User not found.",
        statusCode: 404,
      };
    }

    const refunds = await UserPaymentModel.find({
      userId,
      status: "Refunded",
    })
      .sort({ refundedAt: -1 })
      .limit(25)
      .lean<IUserPayment[]>();

    const totalRefunded = refunds.reduce(
      (sum, record) => sum + Math.max(record.refundAmount ?? 0, 0),
      0
    );

    const eventIds = Array.from(
      new Set(
        refunds
          .map((record) => record.eventId?.toString())
          .filter((value): value is string => Boolean(value))
      )
    );

    const events = eventIds.length
      ? await EventModel.find({ _id: { $in: eventIds } })
          .select(["name"])
          .lean<Array<IEvent & { _id: Types.ObjectId }>>()
      : [];

    const eventMap = new Map(events.map((ev) => [ev._id.toString(), ev.name]));

    return {
      success: true,
      message: "Wallet summary retrieved successfully.",
      data: {
        balance: user.balance ?? 0,
        totalRefunded,
        refunds: refunds.map((record) => ({
          eventId: record.eventId?.toString() ?? "",
          eventName: eventMap.get(record.eventId?.toString() ?? ""),
          amount: record.refundAmount ?? 0,
          refundedAt: record.refundedAt ?? undefined,
          receiptNumber: record.receiptNumber,
          refundReference: record.refundReference,
        })),
      },
    };
  } catch (error) {
    console.error("getWalletRefundSummary error:", error);
    return {
      success: false,
      message: "Failed to load wallet summary.",
      statusCode: 500,
    };
  }
}
