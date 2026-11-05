import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createHomework = {
  body: joi
    .object({
      title: joi.string().required(),
      description: joi.string().required(),
      dueDate: joi.date().required(),
      studentId: generalFeilds.id.required(),
      subjectId: generalFeilds.id.required(),
      status: joi.string().valid("pending", "submitted", "completed").optional(),
    })
    .required(),
};

export const updateHomework = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
  body: joi
    .object({
      title: joi.string().optional(),
      description: joi.string().optional(),
      dueDate: joi.date().optional(),
      studentId: generalFeilds.id.optional(),
      subjectId: generalFeilds.id.optional(),
      status: joi.string().valid("pending", "submitted", "completed").optional(),
    })
    .required(),
};

export const deleteHomework = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const getHomework = {
  params: joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const getAllHomework = {
  query: joi.object({
    studentId: generalFeilds.id.optional(),
    subjectId: generalFeilds.id.optional(),
    teacherId: generalFeilds.id.optional(),
    status: joi.string().optional(),
  }).optional(),
};
