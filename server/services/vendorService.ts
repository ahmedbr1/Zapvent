import vendorModel from "../models/Vendor";
import { z } from "zod";

// Zod schema for vendor signup validation
export const VendorSignupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(20, { message: 'Password must be at most 20 characters long' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' })
    .trim(),
  companyName: z.string()
    .min(2, { message: 'Company name must be at least 2 characters long.' })
    .max(50, { message: 'Company name must be at most 50 characters long.' })
    .trim(),
});

export type VendorSignupData = z.infer<typeof VendorSignupSchema>;

export async function findAll() {
  return vendorModel.find().lean();
}

export async function create(data: any) {
  const doc = new vendorModel(data);
  return doc.save();
}

// Vendor signup service function
export async function signup(vendorData: VendorSignupData) {
  // Validate with Zod
  const validatedData = VendorSignupSchema.parse(vendorData);
  
  // Create vendor with default values for required fields
  const vendorDataWithDefaults = {
    ...validatedData,
    phoneNumber: "",
    contactPersonName: "",
    documents: "", // Fixed: use correct field name
    logo: "",
    taxCard: "",
    loyaltyForum: ""
  };
  
  const vendor = new vendorModel(vendorDataWithDefaults);
  await vendor.save();
  
  // Return vendor without password
  const { password, ...vendorWithoutPassword } = vendor.toObject();
  return vendorWithoutPassword;
}