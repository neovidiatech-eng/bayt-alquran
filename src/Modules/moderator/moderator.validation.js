import Joi from "joi";
import { generalFeilds, validateInternationalPhoneLength } from "../../Utils/GeneralFields/index.js";

const joi = Joi;

const getAllModerators = {
  query: Joi.object({
    page: generalFeilds.page.required(),
    limit: generalFeilds.limit.required(),
    search: generalFeilds.search.optional(),
    order: generalFeilds.order.optional(),
    orderBy: generalFeilds.orderBy.valid("createdAt", "active").when("order", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};

const createModerator = {
  body: Joi
    .object({
      name: Joi.string().required(),
      codeCountry: generalFeilds.codeCountry.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      phone: generalFeilds.phone.optional(),
      age: generalFeilds.age.required(),
      gender: generalFeilds.gender.required(),
      salary: Joi.number().min(0).optional(),
      studentIds: Joi.array().items(generalFeilds.id).required(),
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

const getModeratorById = {
  params: Joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

const updateModerator = {
  params: Joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
  body: Joi
    .object({
      name: Joi.string().optional(),
      codeCountry: generalFeilds.codeCountry.optional(),
      email: generalFeilds.email.optional(),
      password: generalFeilds.password.optional(),
      phone: generalFeilds.phone.optional(),
      age: generalFeilds.age.optional(),
      gender: generalFeilds.gender.optional(),
      salary: Joi.number().min(0).optional(),
      status: Joi.string().valid("active", "inactive").optional(),
      studentIds: Joi.array().items(generalFeilds.id).optional(),
    })
    .custom(
      validateInternationalPhoneLength({
        codeCountryKey: "codeCountry",
      }),
    )
    .required(),
};

const deleteModerator = {
  params: Joi
    .object({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const registerModeratorSchema = {
  body: Joi.object()
    .keys({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      expectedSalary: Joi.number().optional(),
      comfirmPassword: generalFeilds.confirmPassword.optional(),
      confirmPassword: generalFeilds.confirmPassword.optional(),
      codeCountry: generalFeilds.codeCountry.required(),
      phone: generalFeilds.phone.required(),
      gender: generalFeilds.gender.required(),
      country: generalFeilds.country.optional(),
      nationality: generalFeilds.nationality.optional(),
      timezone: Joi.string().optional(),
      city: generalFeilds.city.optional(),
      age: generalFeilds.age.optional(),
      notes: Joi.string().allow("").trim().optional(),
      additionalData: Joi.object().keys({
        whatsappNumber: Joi.string().optional(),
        birthDate: generalFeilds.birth_date.optional(),
        qualification: Joi.string().optional(),
        hasPersonalLaptop: Joi.boolean().optional(),
        governorate: Joi.string().optional(),
        maritalStatus: Joi.string().optional(),
        hasCurrentJob: Joi.boolean().optional(),
        hasFreeTimeFrom3To8: Joi.boolean().optional(),
        dailyFreeTimeHours: Joi.string().optional(),
        agreedToWorkConditions: Joi.boolean().optional(),
      }).optional(),
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

export const getModeratorRequestsSchema = {
  query: Joi.object({
    page: generalFeilds.page.optional(),
    limit: generalFeilds.limit.optional(),
  }),
};

export const approveModeratorRequestSchema = {
  params: Joi.object({
    userId: generalFeilds.id.required(),
  }),
  body: Joi.object({
    studentIds: Joi.array().items(generalFeilds.id).optional(),
    salary:Joi.number().optional(),
  }).optional(),
};

export const rejectModeratorRequestSchema = {
  params: Joi.object({
    userId: generalFeilds.id.required(),
  }),
};

export const changeStatus = {
  body: Joi.object({
    id: generalFeilds.id.required(),
    status: Joi.string().valid("active", "inactive").required(),
  }).required(),
};

export {
  getAllModerators,
  createModerator,
  getModeratorById,
  updateModerator,
  deleteModerator,
};

