import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";
export const getAllTeachersSchema = {
  query: joi.object({
    search: generalFeilds.search,
    /*  page: generalFeilds.page,
    limit: generalFeilds.limit,
    sort: generalFeilds.sort,
    sortType: generalFeilds.sortType, */
  }),
};

export const createTeacherSchema = {
  body: joi
    .object({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      phone: generalFeilds.phone.required(),
      code_country: generalFeilds.codeCountry.required(),
      subject_ids: joi.array().items(
        generalFeilds.id.messages({
          "string.base": "SUBJECT_ID_STRING",
          "string.empty": "SUBJECT_ID_EMPTY",
        }),
      ),
      currency_id: generalFeilds.id
        .messages({
          "string.base": "CURRENCY_ID_STRING",
          "string.empty": "CURRENCY_ID_EMPTY",
          "any.required": "CURRENCY_ID_REQUIRED",
        })
        .required(),
      gender: generalFeilds.gender.required(),
      hour_price: generalFeilds.price.required(),
      active: generalFeilds.active.required(),
      timezone: joi.string().optional(),
      meeting_link: generalFeilds.url
        .messages({
          "string.base": "MEETING_LINK_STRING",
          "string.empty": "MEETING_LINK_EMPTY",
          "any.required": "MEETING_LINK_REQUIRED",
        })
        .optional(),
    })
    .required(),
};

export const getTeacherSchema = {
  params: joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const deleteTeacherSchema = {
  params: joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const updateTeacherSchema = {
  params: joi.object({
    id: generalFeilds.id.required(),
  }),
  body: joi
    .object({
      name: generalFeilds.name,
      email: generalFeilds.email,
      password: generalFeilds.password,
      phone: generalFeilds.phone,
      code_country: generalFeilds.codeCountry,
      currency_id: generalFeilds.id.messages({
        "string.base": "CURRENCY_ID_STRING",
        "string.empty": "CURRENCY_ID_EMPTY",
      }),
      gender: generalFeilds.gender,
      meeting_link: generalFeilds.url
        .messages({
          "string.base": "MEETING_LINK_STRING",
          "string.empty": "MEETING_LINK_EMPTY",
          "any.required": "MEETING_LINK_REQUIRED",
        })
        .optional(),

      hour_price: generalFeilds.price,
      active: generalFeilds.active,
      subject_ids: joi.array().items(
        generalFeilds.id.messages({
          "string.base": "SUBJECT_ID_STRING",
          "string.empty": "SUBJECT_ID_EMPTY",
        }),
      ),
      timezone: joi.string().optional(),
    })
    .required(),
};
