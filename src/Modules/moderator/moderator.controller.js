import { asyncHandler, successResponse } from "../../Utils/Response.js";
import * as moderatorService from "./moderator.service.js";

export const getAllModerators = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.getAllModerators(req);
  return successResponse({
    req,
    res,
    data,
    message: "success",
    statusCode: 200,
    messageKey: "all_moderators_fetched_successfully",
  });
});

export const getModeratorById = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.getModeratorById(req);
  return successResponse({
    req,
    res,
    data,
    message: "success",
    statusCode: 200,
    messageKey: "MODERATOR_FETCHED_SUCCESS",
  });
});

export const createModerator = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.createModerator(req);
  return successResponse({
    req,
    res,
    data,
    message: "success",
    statusCode: 201,
    messageKey: "MODERATOR_CREATED_SUCCESS",
  });
});

export const updateModerator = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.updateModerator(req);
  return successResponse({
    req,
    res,
    data,
    message: "success",
    statusCode: 200,
    messageKey: "MODERATOR_UPDATED_SUCCESS",
  });
});

export const deleteModerator = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.deleteModerator(req);
  return successResponse({
    req,
    res,
    message: "MODERATOR_DELETED_SUCCESS",
    statusCode: 200,
    messageKey: "MODERATOR_DELETED_SUCCESS",
  });
});
export const getAllStudents = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.getAllStudents(req);
  return successResponse({
    req,
    res,
    data,
    message: "success",
    statusCode: 200,
    messageKey: "STUDENTS_FETCHED_SUCCESS",
  });
});

export const changeStatus = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.changeStatus(req);
  return successResponse({
    req,
    res,
    data,
    message: "MODERATOR_STATUS_UPDATED_SUCCESS",
    statusCode: 200,
    messageKey: "MODERATOR_STATUS_UPDATED_SUCCESS",
  });
});

export const signUpModerator = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    comfirmPassword,
    codeCountry,
    phone,
    expectedSalary,
    gender,
    country,
    nationality,
    timezone,
    city,
    age,
    notes,
    additionalData,
  } = req.body;

  const data = await moderatorService.signUpModerator({
    name,
    email,
    password,
    confirmPassword: confirmPassword || comfirmPassword,
    codeCountry,
    phone,
    expectedSalary,
    gender,
    country,
    nationality,
    timezone,
    city,
    age,
    notes,
    additionalData,
    lang: req.lang,
  });

  return successResponse({
    req,
    res,
    data,
    message: "MODERATOR_SIGNUP_SUCCESS",
    statusCode: 201,
    messageKey: "MODERATOR_SIGNUP_SUCCESS",
  });
});

export const getModeratorRequests = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.getModeratorRequests(req);
  return successResponse({
    req,
    res,
    data,
    message: "FETCH_SUCCESS",
    statusCode: 200,
    messageKey: "FETCH_SUCCESS",
  });
});

export const approveModeratorRequest = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.approveModeratorRequest(req);
  return successResponse({
    req,
    res,
    data,
    message: "MODERATOR_APPROVED_SUCCESS",
    statusCode: 200,
    messageKey: "MODERATOR_APPROVED_SUCCESS",
  });
});

export const rejectModeratorRequest = asyncHandler(async (req, res, next) => {
  const data = await moderatorService.rejectModeratorRequest(req);
  return successResponse({
    req,
    res,
    data,
    message: "MODERATOR_REQUEST_REJECTED",
    statusCode: 200,
    messageKey: "MODERATOR_REQUEST_REJECTED",
  });
});


