import { Request, Response } from "express";
import { cancelGymSession } from "../services/gymSessionService";

export async function cancelGymSessionController(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const result = await cancelGymSession(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Cancel gym session controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}
