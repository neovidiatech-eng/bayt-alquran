import joi from "joi";
import { asyncHandler } from "../Utils/Response.js";

const translateValidationDetail = (req, detail) => {
  const params = {};
  let messageKey = detail.message;

  if (detail.context?.limit !== undefined) {
    params.limit = detail.context.limit;
    messageKey = messageKey.replace(
      String(detail.context.limit),
      "{#limit}",
    );
  }

  return req.t(messageKey, params);
};

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
      error.details.map((detail) => translateValidationDetail(req, detail)),
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
