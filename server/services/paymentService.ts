import { Types } from "mongoose";
import EventModel, { EventType, IEvent } from "../models/Event";
import UserModel, { IUser } from "../models/User";
import UserPaymentModel, {
  PaymentMethod,
  IUserPayment,
} from "../models/UserPayment";
import { emailService } from "./emailService";
import Stripe from "stripe";
import { registerUserForWorkshop } from "./eventService";

const DEFAULT_CURRENCY = process.env.EVENT_PAYMENT_CURRENCY || "EGP";
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  : null;

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

type StripeIntentData = {
  clientSecret: string;
  paymentIntentId: string;
};

type PaymentIntentWithOptionalCharges = Stripe.PaymentIntent & {
  charges?: Stripe.ApiList<Stripe.Charge>;
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

    if (userIsRegistered(event, userId)) {
      return {
        success: false,
        message: "You are already registered for this event.",
        statusCode: 409,
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

    const now = new Date();
    const startDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    if (startDate.getTime() - now.getTime() < fourteenDaysMs) {
      return {
        success: false,
        message: "Cancellations are only allowed up to 14 days before the event starts.",
        statusCode: 400,
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

export async function createStripePaymentIntent(
  eventId: string,
  userId: string
): Promise<ServiceResponse<StripeIntentData>> {
  try {
    if (!stripeClient) {
      return {
        success: false,
        message: "Stripe is not configured.",
        statusCode: 500,
      };
    }

    const resolved = await ensureEventAndUser(eventId, userId);
    if (!resolved.success) {
      return resolved;
    }

    const { event } = resolved;
    if (!isRegistrationAllowed(event)) {
      return {
        success: false,
        message: "Payments are only supported for workshops and trips.",
        statusCode: 400,
      };
    }

    const priceRaw =
      typeof event.price === "number" && !Number.isNaN(event.price)
        ? event.price
        : 0;
    if (priceRaw <= 0) {
      return {
        success: false,
        message: "This event does not require card payments.",
        statusCode: 400,
      };
    }

    const amountInMinorUnits = Math.round(priceRaw * 100);
    const currency = (DEFAULT_CURRENCY || "usd").toLowerCase();

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amountInMinorUnits,
      currency,
      payment_method_types: ["card"],
      metadata: {
        eventId: event._id.toString(),
        userId,
      },
    });

    if (!paymentIntent.client_secret) {
      return {
        success: false,
        message: "Failed to create Stripe payment intent.",
        statusCode: 500,
      };
    }

    return {
      success: true,
      message: "Stripe payment intent created.",
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    };
  } catch (error) {
    console.error("createStripePaymentIntent error:", error);
    return {
      success: false,
      message: "Failed to initiate Stripe payment.",
      statusCode: 500,
    };
  }
}

export async function finalizeStripePayment(
  eventId: string,
  userId: string,
  paymentIntentId: string
): Promise<ServiceResponse<PayByWalletData>> {
  try {
    if (!stripeClient) {
      return {
        success: false,
        message: "Stripe is not configured.",
        statusCode: 500,
      };
    }

    const resolved = await ensureEventAndUser(eventId, userId);
    if (!resolved.success) {
      return resolved;
    }
    const { event, user } = resolved;

    const paymentIntent = (await stripeClient.paymentIntents.retrieve(
      paymentIntentId
    )) as PaymentIntentWithOptionalCharges;

    if (!paymentIntent || typeof paymentIntent.metadata !== "object") {
      return {
        success: false,
        message: "Invalid payment intent provided.",
        statusCode: 400,
      };
    }

    if (
      paymentIntent.metadata?.eventId !== event._id.toString() ||
      paymentIntent.metadata?.userId !== userId
    ) {
      return {
        success: false,
        message: "Payment intent does not match this registration.",
        statusCode: 400,
      };
    }

    if (paymentIntent.status !== "succeeded") {
      return {
        success: false,
        message: "Stripe payment has not completed.",
        statusCode: 400,
      };
    }

    const existingPayment = await UserPaymentModel.findOne({
      transactionReference: paymentIntent.id,
    }).lean<IUserPayment | null>();

    if (existingPayment) {
      return {
        success: true,
        message: "Payment already recorded.",
        data: {
          receiptNumber: existingPayment.receiptNumber,
          method: existingPayment.method,
          walletPortion: existingPayment.walletPortion,
          cardPortion: existingPayment.cardPortion,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          eventId: existingPayment.eventId.toString(),
          eventName: event.name,
          balance: user.balance ?? 0,
          transactionReference:
            existingPayment.transactionReference ?? paymentIntent.id,
        },
      };
    }

    const amountReceived =
      typeof paymentIntent.amount_received === "number"
        ? paymentIntent.amount_received
        : typeof paymentIntent.amount === "number"
          ? paymentIntent.amount
          : 0;
    const price = amountReceived / 100;

    if (!userIsRegistered(event, userId)) {
      const registrationResult = await registerUserForWorkshop(eventId, userId);
      if (!registrationResult.success) {
        try {
          await stripeClient.refunds.create({
            payment_intent: paymentIntent.id,
            reason: "requested_by_customer",
          });
        } catch (refundError) {
          console.error("Failed to auto-refund after registration error:", refundError);
        }
        return {
          success: false,
          message:
            registrationResult.message ??
            "Payment succeeded but we couldn't finalize your registration. Please contact support.",
          statusCode: registrationResult.statusCode ?? 400,
        };
      }
    }

    const receiptNumber = generateReference("STR");

    const paymentRecord = new UserPaymentModel({
      userId,
      eventId,
      amount: price,
      currency: (paymentIntent.currency ?? DEFAULT_CURRENCY).toUpperCase(),
      method: "CreditCard",
      walletPortion: 0,
      cardPortion: price,
      cardType: "CreditCard",
      cardLast4:
        typeof paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.last4 ===
        "string"
          ? paymentIntent.charges.data[0].payment_method_details.card.last4
          : undefined,
      status: "Paid",
      receiptNumber,
      paidAt: new Date(),
      transactionReference: paymentIntent.id,
    });

    await paymentRecord.save();

    await EventModel.findByIdAndUpdate(eventId, {
      $inc: { revenue: price },
    });

    await emailService.sendUserEventPaymentReceipt({
      recipientEmail: user.email,
      recipientName: `${user.firstName} ${user.lastName}`.trim(),
      eventName: event.name,
      eventType: event.eventType,
      amount: price,
      currency: DEFAULT_CURRENCY,
      walletPortion: 0,
      cardPortion: price,
      method: "CreditCard",
      receiptNumber,
      paidAt: new Date(),
    });

    return {
      success: true,
      message: "Payment confirmed successfully.",
      data: {
        receiptNumber,
        method: "CreditCard",
        walletPortion: 0,
        cardPortion: price,
        amount: price,
        currency: DEFAULT_CURRENCY,
        eventId: event._id.toString(),
        eventName: event.name,
        balance: user.balance ?? 0,
        transactionReference: paymentIntent.id,
      },
    };
  } catch (error) {
    console.error("finalizeStripePayment error:", error);
    return {
      success: false,
      message: "Failed to confirm Stripe payment.",
      statusCode: 500,
    };
  }
}
