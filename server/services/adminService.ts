import UserModel, { userRole } from "../models/User";
import { emailService } from "./emailService";


export async function approveUser(userId: string) {
  const user = await UserModel.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.verified) {
    throw new Error('User is already verified');
  }

  if (user.role === userRole.STUDENT) {
    throw new Error('Students are auto-verified and do not need admin approval');
  }

  // Approve the user
  user.verified = true;
  await user.save();

  // Send approval email
  await emailService.sendApprovalEmail(user);

  return {
    message: 'User approved successfully and notification email sent',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      verified: user.verified
    }
  };
}

export async function rejectUser(userId: string, reason?: string) {
  const user = await UserModel.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.verified) {
    throw new Error('Cannot reject an already verified user');
  }

  // Send rejection email before deleting
  await emailService.sendRejectionEmail(user, reason);

  // Delete the rejected user
  await UserModel.findByIdAndDelete(userId);

  return {
    message: 'User rejected and notified successfully',
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  };
}
