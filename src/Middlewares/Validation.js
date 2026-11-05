import joi from "joi";
import { asyncHandler } from "../Utils/Response.js";

export const validation = (schema) => {
  const handler = asyncHandler(async (req, res, next) => {
    const validationErrors = [];

    for (const key of Object.keys(schema)) {
      const validationResult = await schema[key].validate(req[key], {
        abortEarly: false,
      });
      if (validationResult.error) {
        validationErrors.push(validationResult.error);
      }
    }
    const errors = validationErrors.flatMap((error) => 
      error.details.map((detail) => req.t(detail.message))
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: req.t("VALIDATION_ERROR"),
        status: 400,
        errors,
      });
    }
    next();
  });
  handler.schema = schema;
  return handler;
};
