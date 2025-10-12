import { Request, Response } from "express";
import { updateVendorStatus } from "../services/vendorService";
import { VendorStatus } from "../models/Vendor";

export async function approveVendorController(req: Request, res: Response) {
  const { id } = req.params;
  const result = await updateVendorStatus(id, VendorStatus.APPROVED);
  if (!result.success) return res.status(404).json(result);
  return res.status(200).json(result);
}

export async function rejectVendorController(req: Request, res: Response) {
  const { id } = req.params;
  const result = await updateVendorStatus(id, VendorStatus.REJECTED);
  if (!result.success) return res.status(404).json(result);
  return res.status(200).json(result);
}