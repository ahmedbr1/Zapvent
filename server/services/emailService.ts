import nodemailer, {
  type Transporter,
  type SendMailOptions,
} from "nodemailer";
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
}

export const emailService = new EmailService();
