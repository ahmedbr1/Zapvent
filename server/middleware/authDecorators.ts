import { NextFunction, Response } from "express";
import "reflect-metadata";
import {
  adminRequired,
  allowedRoles as allowedRolesMiddleware,
  AuthRequest,
  loginRequired,
  optionalAuth,
  UserRole,
} from "./authMiddleware";

/**
 * Requires valid JWT token (any role)
 * Usage: @LoginRequired()
 */
export function LoginRequired() {
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
      return new Promise<void>((resolve, reject) => {
        loginRequired(req, res, (err?: string) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
        .then(() => originalMethod.apply(this, [req, res, next]))
        .catch(() => {
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message: "Authentication error",
            });
          }
        });
    };

    return descriptor;
  };
}

/**
 * Requires Admin role
 * Usage: @AdminRequired()
 */
export function AdminRequired() {
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
      // Apply adminRequired middleware
      return new Promise<void>((resolve, reject) => {
        adminRequired(req, res, (err?: string) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
        .then(() => originalMethod.apply(this, [req, res, next]))
        .catch(() => {
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message: "Authorization error",
            });
          }
        });
    };

    return descriptor;
  };
}

/**
 * Requires one of the specified roles
 * Usage: @AllowedRoles(['Admin', 'Vendor'])
 */
export function AllowedRoles(roles: UserRole[]) {
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
      const middleware = allowedRolesMiddleware(roles);

      return new Promise<void>((resolve, reject) => {
        middleware(req, res, (err?: string) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
        .then(() => originalMethod.apply(this, [req, res, next]))
        .catch(() => {
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message: "Authorization error",
            });
          }
        });
    };

    return descriptor;
  };
}

export function OptionalAuth() {
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
      const middleware = optionalAuth();

      return new Promise<void>((resolve, reject) => {
        middleware(req, res, (err?: string) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
        .then(() => originalMethod.apply(this, [req, res, next]))
        .catch(() => {
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message: "Authorization error",
            });
          }
        });
    };

    return descriptor;
  };
}
