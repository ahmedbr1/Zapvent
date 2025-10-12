import { NextFunction, Response } from "express";
import "reflect-metadata";
import { AuthRequest } from "./authMiddleware";

/**
 * Method decorator: Validates request body against schema
 * Usage: @ValidateBody(schema)
 */
export function ValidateBody(schema: { required?: string[] }) {
  return function (
    target: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ) {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body is required",
        });
      }

      if (schema.required) {
        for (const field of schema.required) {
          if (
            !(field in req.body) ||
            req.body[field] === undefined ||
            req.body[field] === null ||
            req.body[field] === ""
          ) {
            return res.status(400).json({
              success: false,
              message: `Field '${field}' is required`,
            });
          }
        }
      }

      return originalMethod.apply(this, [req, res, next]);
    };

    return descriptor;
  };
}
