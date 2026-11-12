import joi from "joi";
import {
  generalFeilds,
  validateInternationalPhoneLength,
} from "../../Utils/GeneralFields/index.js";
export const getAllTeachersSchema = {
  query: joi.object({
    search: generalFeilds.search,
    page: generalFeilds.page,
    limit: generalFeilds.limit,
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
      country: generalFeilds.country.optional(),
      nationality: generalFeilds.nationality.optional(),
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
      active: generalFeilds.active.required(),
      timezone: joi.string().optional(),
      city: generalFeilds.city.optional(),
      age: generalFeilds.age.optional(),
      one_hour_price: generalFeilds.hourPrice.required(),
      group_hour_price: generalFeilds.hourPrice.required(),
      meeting_link: generalFeilds.url
        .messages({
          "string.base": "MEETING_LINK_STRING",
          "string.empty": "MEETING_LINK_EMPTY",
          "any.required": "MEETING_LINK_REQUIRED",
        })
        .optional(),
    })
    .custom(
      validateInternationalPhoneLength({
        codeCountryKey: "code_country",
      }),
    )
    .messages({
      "phone.e164Length": "PHONE_E164_MAX_LENGTH",
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
      country: generalFeilds.country,
      nationality: generalFeilds.nationality,
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

      active: generalFeilds.active.optional(),
      subject_ids: joi.array().items(
        generalFeilds.id.messages({
          "string.base": "SUBJECT_ID_STRING",
          "string.empty": "SUBJECT_ID_EMPTY",
        }),
      ),
      timezone: joi.string().optional(),
      city: generalFeilds.city.optional(),
      age: generalFeilds.age.optional(),
      one_hour_price: generalFeilds.hourPrice.optional(),
      group_hour_price: generalFeilds.hourPrice.optional(),
    })
    .custom(
      validateInternationalPhoneLength({
        codeCountryKey: "code_country",
      }),
    )
    .messages({
      "phone.e164Length": "PHONE_E164_MAX_LENGTH",
    })
    .required(),
};

export const updateStudentHourPriceSchema = {
  params: joi.object({
    teacherId: generalFeilds.id.required(),
  }),
  body: joi.object({
    hour_price: joi.number().positive().required().messages({
      "number.base": "HOUR_PRICE_MUST_BE_NUMBER",
      "number.positive": "HOUR_PRICE_MUST_BE_POSITIVE",
      "any.required": "HOUR_PRICE_REQUIRED",
    }),
    studentId: generalFeilds.id.required().messages({
      "string.base": "STUDENT_ID_STRING",
      "string.empty": "STUDENT_ID_EMPTY",
      "any.required": "STUDENT_ID_REQUIRED",
    }),
  }),
};
