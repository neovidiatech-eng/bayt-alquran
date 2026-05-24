import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createCourse = {
  body: joi
    .object({
      title: joi.string().required(),
      description: joi.string().required(),
      duration: joi.number().optional(),
      subjectId: generalFeilds.id.required(),
      videoUrl: joi.string().optional(),
      pdfurl: joi.string().optional(),
      attachments: joi.array().optional(),
    })
    .required(),
  file: joi.object(generalFeilds.file).optional()
};

export const updateCourse = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
  body: joi
    .object({
      title: joi.string().optional(),
      description: joi.string().optional(),
      duration: joi.number().optional(),
      subjectId: generalFeilds.id.optional(),
      status: joi.string().valid("active", "inactive").optional(),
      videoUrl: joi.string().optional(),
      pdfurl: joi.string().optional(),
      attachments: joi.array().optional(),
    })
    .required(),
  file: joi.object(generalFeilds.file).optional()
};

export const deleteCourse = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const getCourse = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const getAllCourse = {
  query: joi.object({
    subjectId: generalFeilds.id.optional(),
    status: joi.string().optional(),
  }).optional(),
};
