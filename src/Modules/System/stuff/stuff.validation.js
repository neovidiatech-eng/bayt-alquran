import Joi from "joi";
import {
  generalFeilds,
  validateInternationalPhoneLength,
} from "../../../Utils/GeneralFields/index.js";

export const createStuffUserSchema = {
  body: Joi.object({
    name: generalFeilds.name.required(),
    email: generalFeilds.email.required(),
    password: generalFeilds.password.required(),
    phone: generalFeilds.phone.required(),
    code_country: generalFeilds.codeCountry.required(),
    roleId: generalFeilds.id.required(),
    city: generalFeilds.city.optional(),
    age: generalFeilds.age.optional(),
  })
    .custom(
      validateInternationalPhoneLength({
        codeCountryKey: "code_country",
      }),
    )
    .messages({
      "phone.e164Length": "PHONE_E164_MAX_LENGTH",
    }),
};

export const updateStuffUserSchema = {
  body: Joi.object({
    name: generalFeilds.name.optional(),
    phone: generalFeilds.phone.optional(),
    code_country: generalFeilds.codeCountry.optional(),
    roleId: generalFeilds.id.optional(),
    password: generalFeilds.password.optional(),
    email: generalFeilds.email.optional(),
    city: generalFeilds.city.optional(),
    age: generalFeilds.age.optional(),
  })
    .custom(
      validateInternationalPhoneLength({
        codeCountryKey: "code_country",
      }),
    )
    .messages({
      "phone.e164Length": "PHONE_E164_MAX_LENGTH",
    }),
};

export const deleteStuffUserSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const getStuffByIdSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }),
};

export const getAllStuffSchema = {
  query: Joi.object({
    search: Joi.string(),
  }),
};

export const addParentSchema = {
  body: Joi.object()
    .keys({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      codeCountry: generalFeilds.codeCountry.required(),
      country: generalFeilds.country.required(),
      phone: generalFeilds.phone.required(),
      timezone: Joi.string().optional(),
      students: Joi.array().items(generalFeilds.id).required(),
      city: generalFeilds.city.optional(),
      age: generalFeilds.age.optional(),
    })
    .custom(
      validateInternationalPhoneLength({
        codeCountryKey: "codeCountry",
      }),
    )
    .messages({
      "phone.e164Length": "PHONE_E164_MAX_LENGTH",
    })
    .required(),
};
