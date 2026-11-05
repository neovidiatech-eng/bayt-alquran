import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const getAllParentsSchema = {
  query: joi.object({
    search: generalFeilds.search,
    page: generalFeilds.page.optional(),
    limit: generalFeilds.limit.optional(),
    active: joi.string().valid("true", "false").optional(),
  }),
};

export const getParentSchema = {
  params: joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const createParentSchema = {
  body: joi.object({
    name: generalFeilds.name.required(),
    email: generalFeilds.email.required(),
    password: generalFeilds.password.required(),
    phone: generalFeilds.phone.required(),
    code_country: generalFeilds.codeCountry.required(),
    active: joi.boolean().optional(),
    students: joi.array().items(generalFeilds.id).optional(),
  }).required(),
};

export const updateParentSchema = {
  params: joi.object({
    id: generalFeilds.id.required(),
  }),
  body: joi.object({
    name: generalFeilds.name,
    email: generalFeilds.email,
    password: generalFeilds.password,
    phone: generalFeilds.phone,
    code_country: generalFeilds.codeCountry,
    active: joi.boolean().optional(),
    students: joi.array().items(generalFeilds.id).optional(),
  }).required(),
};

export const deleteParentSchema = {
  params: joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const studentIdSchema = {
  params: joi.object({
    studentId: generalFeilds.id.required(),
  }),
};

