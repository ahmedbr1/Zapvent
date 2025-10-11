import { Request, Response } from "express";
import * as userService from "../services/userService";

export async function getUsers(req: Request, res: Response) {
  const users = await userService.findAll();
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const data = req.body;
  const user = await userService.create(data);
  res.status(201).json(user);
}

export async function getUserRegisteredEvents(req: Request, res: Response) {
  const userId =
    (req.params.userId as string | undefined) ??
    (req.query.userId as string | undefined);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Missing user id.",
    });
  }

  const result = await userService.findRegisteredEvents(userId);

  if (!result.success) {
    const status = result.message === "User not found." ? 404 : 400;
    return res.status(status).json(result);
  }

  return res.json(result);
}
