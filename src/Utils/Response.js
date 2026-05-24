import multer from "multer";
import { Prisma } from "@prisma/client";
import { getMessage, getDir } from "./i18n.js";

// =========================
// 🔹 Async Wrapper
// =========================
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// =========================
// 🔹 Global Error Handler
// =========================
export const globalErrorHandling = (err, req, res, next) => {
  const lang = req?.lang || "en";

  // =========================
  // 🟡 Multer Errors
  // =========================
  if (err instanceof multer.MulterError) {
    const multerKeys = {
      LIMIT_UNEXPECTED_FILE: "MULTER_LIMIT_UNEXPECTED_FILE",
      LIMIT_FILE_SIZE: "MULTER_LIMIT_FILE_SIZE",
      LIMIT_FILE_COUNT: "MULTER_LIMIT_FILE_COUNT",
      LIMIT_FIELD_KEY: "MULTER_LIMIT_FIELD_KEY",
      LIMIT_FIELD_VALUE: "MULTER_LIMIT_FIELD_VALUE",
      LIMIT_FIELD_COUNT: "MULTER_LIMIT_FIELD_COUNT",
      LIMIT_PART_COUNT: "MULTER_LIMIT_PART_COUNT",
    };

    const key = multerKeys[err.code] || "MULTER_FILE_UPLOAD_ERROR";
    const errorText = getMessage(key, lang, { field: err.field });

    return res.status(400).json({
      message: getMessage("MULTER_FILE_UPLOAD_ERROR", lang),
      status: 400,
      error: errorText,
    });
  }

  // =========================
  // 🔴 Prisma Known Errors
  // =========================
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let messageKey = "PRISMA_DATABASE_ERROR";
    let messageParams = {};
    let status = 400;

    switch (err.code) {
      case "P2002":
        messageKey = "PRISMA_DUPLICATE_VALUE";
        messageParams = { target: err.meta?.target };
        status = 409;
        break;

      case "P2003":
        // Foreign key
        if (err.meta?.field_name?.includes("studentId")) {
          messageKey = "STUDENT_NOT_FOUND";
        } else {
          messageKey = "PRISMA_INVALID_RELATION";
          messageParams = { field: err.meta?.field_name };
        }
        status = 400;
        break;

      case "P2025":
        messageKey = "PRISMA_RECORD_NOT_FOUND";
        status = 404;
        break;

      default:
        // Use the raw error message if no specific key is mapped
        return res.status(status).json({
          message: getMessage("PRISMA_ERROR", lang),
          status,
          error: err.message,
          ...(process.env.NODE_ENV !== "production" && {
            meta: err.meta,
          }),
        });
    }

    return res.status(status).json({
      message: getMessage("PRISMA_ERROR", lang),
      status,
      error: getMessage(messageKey, lang, messageParams),
      ...(process.env.NODE_ENV !== "production" && {
        meta: err.meta,
      }),
    });
  }

  // =========================
  // 🟠 Prisma Validation Error
  // =========================
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message: getMessage("PRISMA_VALIDATION_ERROR", lang),
      status: 400,
      error: err.message,
    });
  }

  // =========================
  // 🔵 Custom / Unknown Errors
  // =========================
  let status = err.cause;

  if (!status || typeof status !== "number") {
    status = err.status || err.statusCode || 500;
  }

  const errorText = err.message
    ? getMessage(err.message, lang, err.messageParams)
    : getMessage("INTERNAL_SERVER_ERROR", lang);

  return res.status(status).json({
    message: "error",
    status,
    lang: getDir(lang),
    error: errorText,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  });
};

// =========================
// 🔹 Helpers
// =========================
export const errorResponse = ({
  req,
  next,
  status = 400,
  message = "error",
  messageParams = {},
  details = null,
}) => {
  const error = new Error(message);
  error.cause = status;
  error.isMessageKey = true; // Flag for global handler
  error.messageParams = messageParams;
  if (details) error.details = details;
  return next(error);
};

export const successResponse = ({
  res,
  req,
  status = 200,
  data,
  message = "success",
  messageParams = {},
}) => {
  const lang = req?.lang || "en";
  const translatedMessage = getMessage(message, lang, messageParams);

  return res.status(status).json({
    message: translatedMessage,
    status,
    lang: getDir(lang),
    data,
  });
};
