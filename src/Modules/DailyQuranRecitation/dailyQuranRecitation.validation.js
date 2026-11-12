import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";
import { recitationStatus } from "../../Utils/Enums/recitationStatus.js";

export const createDailyQuranRecitation = {
  body: joi
    .object({
      studentId: generalFeilds.id.required(),
      surah: joi.string().trim().required(),
      startPage: joi.number().integer().min(1).default(1),
      endPage: joi.number().integer().min(1).default(1),
      dueDate: joi.date().required(),
      status: joi.string().valid(...Object.values(recitationStatus)).optional(),
    })
    .required(),
};

export const updateDailyQuranRecitation = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
  body: joi
    .object({
      studentId: generalFeilds.id.optional(),
      surah: joi.string().trim().optional(),
      startPage: joi.number().integer().min(1).optional(),
      endPage: joi.number().integer().min(1).optional(),
      dueDate: joi.date().optional(),
      status: joi.string().valid(...Object.values(recitationStatus)).optional(),
    })
    .required(),
};

export const getDailyQuranRecitationById = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const deleteDailyQuranRecitation = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const getAllDailyQuranRecitations = {
  query: joi
    .object({
      studentId: generalFeilds.id.optional(),
      teacherId: generalFeilds.id.optional(),
      status: joi.string().valid(...Object.values(recitationStatus)).optional(),
      surah: joi.string().optional(),
      search: joi.string().optional(),
      page: joi.number().integer().min(1).default(1),
      limit: joi.number().integer().min(1).max(100).default(10),
    })
    .optional(),
};

export const getStudentDailyQuranRecitations = {
  query: joi
    .object({
      status: joi.string().valid(...Object.values(recitationStatus)).optional(),
      page: joi.number().integer().min(1).default(1),
      limit: joi.number().integer().min(1).max(100).default(10),
    })
    .optional(),
};

export const getTeacherDailyQuranRecitations = {
  query: joi
    .object({
      studentId: generalFeilds.id.optional(),
      status: joi.string().valid(...Object.values(recitationStatus)).optional(),
      page: joi.number().integer().min(1).default(1),
      limit: joi.number().integer().min(1).max(100).default(10),
    })
    .optional(),
};

export const submitRecitation = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

