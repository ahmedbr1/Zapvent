import { Request, Response } from "express";
import { viewAllCourts as fetchCourts } from "../services/courtService";

export async function viewAllCourts(req: Request, res: Response) {
  try {
    const result = await fetchCourts();

    if (!result.success) {
      return res.status(404).json(result); 
    }

    res.status(200).json(result); 
  } catch (error) {
    console.error("Error fetching courts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch courts" });
  }
}