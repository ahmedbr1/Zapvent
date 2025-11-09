import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import { IUser } from "../models/User";

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT
  ? Number(process.env.SMTP_PORT)
  : undefined;
const smtpSecure =
  process.env.SMTP_SECURE?.toLowerCase() === "true" ||
  process.env.SMTP_PORT === "465";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const configuredFromAddress =
  process.env.EMAIL_FROM || "Zapvent Dev <no-reply@zapvent.local>";

type TransportContext = {
  transporter: Transporter;
  defaultFrom: string;
  isTestAccount: boolean;
};

let transportPromise: Promise<TransportContext> | null = null;

async function createTransport(): Promise<TransportContext> {
  if (smtpHost) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ?? 587,
      secure: smtpSecure,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: smtpPass ?? "",
          }
        : undefined,
    });

    await transporter.verify().catch((err) => {
      console.warn("EmailService: SMTP verification failed.", err);
      throw err;
    });

    return {
      transporter,
      defaultFrom: configuredFromAddress,
      isTestAccount: false,
    };
  }

  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.info(
    `EmailService: using Ethereal test account (${testAccount.user}).`
  );

  return {
    transporter,
    defaultFrom: `Zapvent Dev <${testAccount.user}>`,
    isTestAccount: true,
  };
}

async function getTransport(): Promise<TransportContext> {
  if (!transportPromise) {
    transportPromise = createTransport().catch((err) => {
      transportPromise = null;
      throw err;
    });
  }
  return transportPromise;
}

async function sendEmail(options: SendMailOptions) {
  const { transporter, defaultFrom, isTestAccount } = await getTransport();

  const info = await transporter.sendMail({
    from: options.from ?? defaultFrom,
    ...options,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl && isTestAccount) {
    console.info(`EmailService: Preview URL ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}

export class EmailService {
  async sendApprovalEmail(user: IUser) {
    try {
      const result = await sendEmail({
        to: user.email,
        subject: `Welcome to Zapvent - Your ${user.role} Account is Approved! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🎉 Welcome to Zapvent, ${user.firstName}!</h2>
            <p>Excellent news! Your <strong>${user.role}</strong> account has been approved by our admin team.</p>
            <p>Your account is now active and you can start using all Zapvent features.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/login/user" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">You can now log in with your email and password.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">© 2025 Zapvent. All rights reserved.</p>
          </div>
        `,
      });

      return result;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }

  async sendRejectionEmail(user: IUser, reason?: string) {
    try {
      const result = await sendEmail({
        to: user.email,
        subject: `Zapvent Account Application Update`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Application Status Update</h2>
            <p>Dear ${user.firstName},</p>
            <p>Thank you for your interest in joining Zapvent as a <strong>${user.role}</strong>.</p>
            <p>After reviewing your application, we are unable to approve your account at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
            <p>If you believe this is an error or have additional information to provide, please contact our admin team.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">© 2025 Zapvent. All rights reserved.</p>
          </div>
        `,
      });

      return result;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }

  async sendStudentVerificationEmail(options: {
    user: IUser;
    verificationUrl: string;
    loginUrl: string;
    expiresAt: Date;
  }) {
    const { user, verificationUrl, loginUrl, expiresAt } = options;
    const expiryString = expiresAt.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const result = await sendEmail({
        to: user.email,
        subject: "Verify your Zapvent account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to Zapvent, ${user.firstName}!</h2>
            <p>You're almost there. Please confirm your student account by clicking the button below.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Verify My Account
              </a>
            </div>
            <p>This link expires on <strong>${expiryString}</strong>. If it expires, you can request a new verification email from the login page.</p>
            <p>Once verified you'll be redirected to <a href="${loginUrl}">the Zapvent login page</a>.</p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">© ${new Date().getFullYear()} Zapvent. All rights reserved.</p>
          </div>
        `,
      });

      return result;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }

  async sendCommentDeletionWarning(options: {
    user: IUser;
    eventName: string;
    eventDate?: Date;
    commentContent: string;
    reason?: string;
  }) {
    const { user, eventName, eventDate, commentContent, reason } = options;

    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "the event";

    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    try {
      const result = await sendEmail({
        to: user.email,
        subject: `Important: Your comment on ${eventName} was removed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #d32f2f;">Comment Removed</h2>
            <p>Hello ${user.firstName},</p>
            <p>Our moderation team removed one of your comments posted on <strong>${eventName}</strong> (${formattedDate}).</p>
            <p style="margin-bottom: 0;">Removed comment:</p>
            <blockquote style="background: #f9f9f9; border-left: 4px solid #d32f2f; padding: 12px; margin-top: 4px;">
              ${escapeHtml(commentContent)}
            </blockquote>
            ${
              reason
                ? `<p><strong>Reason provided:</strong> ${escapeHtml(reason)}</p>`
                : "<p>The comment violated our community guidelines.</p>"
            }
            <p>If you believe this decision was made in error, please reach out to the Events Office.</p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">© ${new Date().getFullYear()} Zapvent. All rights reserved.</p>
          </div>
        `,
      });

      return result;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }

  async sendWorkshopCertificate(options: {
    user: IUser;
    workshopName: string;
    workshopDate: Date;
  }) {
    const { user, workshopName, workshopDate } = options;

    const formattedDate = new Date(workshopDate).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    try {
      const result = await sendEmail({
        to: user.email,
        subject: `Certificate of Attendance - ${workshopName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Certificate of Attendance</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Zapvent Events Platform</p>
            </div>
            <div style="padding: 40px 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; text-align: center; color: #333; margin-bottom: 30px;">
                This certifies that
              </p>
              <h2 style="text-align: center; color: #667eea; margin: 20px 0; font-size: 24px;">
                ${user.firstName} ${user.lastName}
              </h2>
              <p style="font-size: 16px; text-align: center; color: #333; margin: 30px 0;">
                has successfully attended the workshop
              </p>
              <h3 style="text-align: center; color: #333; margin: 20px 0; font-size: 20px;">
                "${workshopName}"
              </h3>
              <p style="text-align: center; color: #666; margin: 30px 0;">
                Held on ${formattedDate}
              </p>
              <div style="text-align: center; margin: 40px 0 20px;">
                <p style="font-size: 18px; color: #667eea; font-weight: bold; margin: 0;">
                  Thank you for attending!
                </p>
              </div>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} Zapvent. All rights reserved.
            </p>
          </div>
        `,
      });

      return result;
    } catch (error) {
      console.error("Email service error:", error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
