import type { RequestHandler } from "express";

declare module "multer" {
	interface MulterOptions {
		dest?: string;
	}

	interface FieldDescriptor {
		name: string;
		maxCount?: number;
	}

	interface MulterInstance {
		fields(fields: FieldDescriptor[]): RequestHandler;
		single(fieldName: string): RequestHandler;
		array(fieldName: string, maxCount?: number): RequestHandler;
		any(): RequestHandler;
	}

		function multer(options?: MulterOptions): MulterInstance;

		export = multer;
		export default multer;
}
