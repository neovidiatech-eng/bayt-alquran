import Joi from "joi";
import {
  generalFeilds,
  validateE164PhoneLength,
} from "../../Utils/GeneralFields/index.js";

export const registeritonSchema = {
  body: validateE164PhoneLength(
    Joi.object().keys({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      codeCountry: generalFeilds.codeCountry.required(),
      birth_date: generalFeilds.birth_date.required(),
      gender: generalFeilds.gender.required(),
      country: generalFeilds.country.required(),
      phone: generalFeilds.phone.required(),
      plan_id: generalFeilds.id
        .messages({
          "string.pattern.base": "VALID_PLAN_ID",
          "any.required": "PLAN_ID_REQUIRED",
          "string.empty": "PLAN_ID_REQUIRED",
        })
        .required(),
      timezone: Joi.string().optional(),
    }),
  ).required(),
};
export const loginSchema = {
  body: Joi.object()
    .keys({
      email: Joi.alternatives()
        .try(
          generalFeilds.email,
          Joi.string().pattern(/^\+?[0-9]{4,15}$/)
        )
        .required()
        .messages({
          "alternatives.match": "VALID_EMAIL_OR_PHONE",
          "any.required": "EMAIL_OR_PHONE_REQUIRED",
          "string.empty": "EMAIL_OR_PHONE_REQUIRED",
        }),
      password: generalFeilds.password.required(),
    })
    .required(),
};
export const googleSignupSchema = {
  body: Joi.object()
    .keys({
      idToken: generalFeilds.idToken.required(),
    })
    .required(),
};
export const googleLoginSchema = {
  body: Joi.object()
    .keys({
      idToken: generalFeilds.idToken.required(),
      provider: generalFeilds.provider.required(),
    })
    .required(),
};
export const verifiyCodeSchema = {
  body: Joi.object()
    .keys({
      email: generalFeilds.email.required(),
      otp: generalFeilds.otp.required(),
    })
    .required(),
};
export const forgetPasswordSchema = {
  body: Joi.object()
    .keys({
      email: generalFeilds.email.required(),
    })
    .required(),
};
export const resendOtpSchema = {
  body: Joi.object()
    .keys({
      email: generalFeilds.email.required(),
    })
    .required(),
};
export const resetPasswordSchema = {
  body: Joi.object()
    .keys({
      email: generalFeilds.email.required(),
      otp: generalFeilds.otp.required(),
      password: generalFeilds.password.required(),
      confirm: generalFeilds.confirmPassword.required(),
    })
    .required(),
};
