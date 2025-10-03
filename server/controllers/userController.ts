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
