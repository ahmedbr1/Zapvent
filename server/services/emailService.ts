import { Resend } from 'resend';
import { IUser } from '../models/User';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}
const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  async sendApprovalEmail(user: IUser) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Zapvent <noreply@zapvent.com>',
        to: [user.email],
        subject: `Welcome to Zapvent - Your ${user.role} Account is Approved! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🎉 Welcome to Zapvent, ${user.firstName}!</h2>
            <p>Excellent news! Your <strong>${user.role}</strong> account has been approved by our admin team.</p>
            <p>Your account is now active and you can start using all Zapvent features.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">You can now log in with your email and password.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">© 2025 Zapvent. All rights reserved.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send approval email: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  async sendRejectionEmail(user: IUser, reason?: string) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Zapvent <noreply@zapvent.com>',
        to: [user.email],
        subject: `Zapvent Account Application Update`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Application Status Update</h2>
            <p>Dear ${user.firstName},</p>
            <p>Thank you for your interest in joining Zapvent as a <strong>${user.role}</strong>.</p>
            <p>After reviewing your application, we are unable to approve your account at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you believe this is an error or have additional information to provide, please contact our admin team.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">© 2025 Zapvent. All rights reserved.</p>
          </div>
        `,
      });

      if (error) {
        throw new Error(`Failed to send rejection email: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();