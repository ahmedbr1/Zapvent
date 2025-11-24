process.env.JWT_SECRET = "test-secret-key-for-validation-tests";

import { Response, NextFunction } from "express";
import { ValidateBody } from "../../../server/middleware/validationDecorators";
import { AuthRequest } from "../../../server/middleware/authMiddleware";

describe("validationDecorators", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      body: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("@ValidateBody", () => {
    class TestController {
      @ValidateBody({ required: ["name", "email"] })
      async testMethodWithRequired(
        req: AuthRequest,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: NextFunction
      ) {
        return res.status(200).json({ success: true, data: req.body });
      }

      @ValidateBody({})
      async testMethodWithoutRequired(
        req: AuthRequest,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: NextFunction
      ) {
        return res.status(200).json({ success: true, data: req.body });
      }

      @ValidateBody({ required: ["username"] })
      async testMethodSingleRequired(
        req: AuthRequest,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: NextFunction
      ) {
        return res.status(200).json({ success: true, data: req.body });
      }

      @ValidateBody({ required: ["field1", "field2", "field3"] })
      async testMethodMultipleRequired(
        req: AuthRequest,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: NextFunction
      ) {
        return res.status(200).json({ success: true, data: req.body });
      }
    }

    it("should allow request with all required fields present", async () => {
      const controller = new TestController();
      mockReq.body = { name: "John Doe", email: "john@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: "John Doe", email: "john@example.com" },
      });
    });

    it("should allow request with extra fields beyond required", async () => {
      const controller = new TestController();
      mockReq.body = {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        city: "New York",
      };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: "John Doe",
          email: "john@example.com",
          age: 30,
          city: "New York",
        }),
      });
    });

    it("should return 400 when required field is missing", async () => {
      const controller = new TestController();
      mockReq.body = { name: "John Doe" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'email' is required",
      });
    });

    it("should return 400 when first required field is missing", async () => {
      const controller = new TestController();
      mockReq.body = { email: "john@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'name' is required",
      });
    });

    it("should return 400 when required field is undefined", async () => {
      const controller = new TestController();
      mockReq.body = { name: "John Doe", email: undefined };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'email' is required",
      });
    });

    it("should return 400 when required field is null", async () => {
      const controller = new TestController();
      mockReq.body = { name: "John Doe", email: null };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'email' is required",
      });
    });

    it("should return 400 when required field is empty string", async () => {
      const controller = new TestController();
      mockReq.body = { name: "John Doe", email: "" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'email' is required",
      });
    });

    it("should return 400 when request body is missing", async () => {
      const controller = new TestController();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.body = undefined as any;

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Request body is required",
      });
    });

    it("should return 400 when request body is empty object", async () => {
      const controller = new TestController();
      mockReq.body = {};

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Request body is required",
      });
    });

    it("should allow request without required fields when schema has no required", async () => {
      const controller = new TestController();
      mockReq.body = { anyField: "anyValue" };

      await controller.testMethodWithoutRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { anyField: "anyValue" },
      });
    });

    it("should return 400 when schema has no required but body is missing", async () => {
      const controller = new TestController();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.body = undefined as any;

      await controller.testMethodWithoutRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Request body is required",
      });
    });

    it("should validate single required field", async () => {
      const controller = new TestController();
      mockReq.body = { username: "testuser" };

      await controller.testMethodSingleRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { username: "testuser" },
      });
    });

    it("should return 400 when single required field is missing", async () => {
      const controller = new TestController();
      mockReq.body = { otherField: "value" };

      await controller.testMethodSingleRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'username' is required",
      });
    });

    it("should validate all multiple required fields", async () => {
      const controller = new TestController();
      mockReq.body = { field1: "value1", field2: "value2", field3: "value3" };

      await controller.testMethodMultipleRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should return 400 when first of multiple required fields is missing", async () => {
      const controller = new TestController();
      mockReq.body = { field2: "value2", field3: "value3" };

      await controller.testMethodMultipleRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'field1' is required",
      });
    });

    it("should return 400 when middle of multiple required fields is missing", async () => {
      const controller = new TestController();
      mockReq.body = { field1: "value1", field3: "value3" };

      await controller.testMethodMultipleRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'field2' is required",
      });
    });

    it("should return 400 when last of multiple required fields is missing", async () => {
      const controller = new TestController();
      mockReq.body = { field1: "value1", field2: "value2" };

      await controller.testMethodMultipleRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'field3' is required",
      });
    });

    it("should allow fields with value 0", async () => {
      const controller = new TestController();
      mockReq.body = { name: 0, email: "email@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: 0, email: "email@example.com" },
      });
    });

    it("should allow fields with boolean false", async () => {
      const controller = new TestController();
      mockReq.body = { name: false, email: "email@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: false, email: "email@example.com" },
      });
    });

    it("should allow fields with arrays", async () => {
      const controller = new TestController();
      mockReq.body = { name: ["item1", "item2"], email: "email@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: ["item1", "item2"], email: "email@example.com" },
      });
    });

    it("should allow fields with empty arrays", async () => {
      const controller = new TestController();
      mockReq.body = { name: [], email: "email@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: [], email: "email@example.com" },
      });
    });

    it("should allow fields with objects", async () => {
      const controller = new TestController();
      mockReq.body = {
        name: { first: "John", last: "Doe" },
        email: "email@example.com",
      };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          name: { first: "John", last: "Doe" },
          email: "email@example.com",
        },
      });
    });

    it("should allow fields with nested empty objects", async () => {
      const controller = new TestController();
      mockReq.body = { name: {}, email: "email@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: {}, email: "email@example.com" },
      });
    });

    it("should handle field names with special characters", async () => {
      class SpecialController {
        @ValidateBody({ required: ["field-name", "field.name", "field_name"] })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async testMethod(req: AuthRequest, res: Response, next: NextFunction) {
          return res.status(200).json({ success: true, data: req.body });
        }
      }

      const controller = new SpecialController();
      mockReq.body = {
        "field-name": "value1",
        "field.name": "value2",
        field_name: "value3",
      };

      await controller.testMethod(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should return 400 for field with special characters when missing", async () => {
      class SpecialController {
        @ValidateBody({ required: ["field-name"] })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async testMethod(req: AuthRequest, res: Response, next: NextFunction) {
          return res.status(200).json({ success: true });
        }
      }

      const controller = new SpecialController();
      mockReq.body = { otherField: "value" };

      await controller.testMethod(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Field 'field-name' is required",
      });
    });

    it("should handle whitespace-only strings as empty", async () => {
      const controller = new TestController();
      mockReq.body = { name: "   ", email: "email@example.com" };

      await controller.testMethodWithRequired(
        mockReq as AuthRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { name: "   ", email: "email@example.com" },
      });
    });
  });
});
