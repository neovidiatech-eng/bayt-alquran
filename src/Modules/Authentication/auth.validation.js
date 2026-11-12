import Joi from "joi";
import {
  generalFeilds,
  validateInternationalPhoneLength,
} from "../../Utils/GeneralFields/index.js";

export const registeritonSchema = {
  body: Joi.object()
    .keys({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      codeCountry: generalFeilds.codeCountry.required(),
      birth_date: generalFeilds.birth_date.required(),
      gender: generalFeilds.gender.required(),
      country: generalFeilds.country.required(),
      nationality: generalFeilds.nationality.required(),
      phone: generalFeilds.phone.required(),
      plan_id: generalFeilds.id
        .messages({
          "string.pattern.base": "VALID_PLAN_ID",
          "any.required": "PLAN_ID_REQUIRED",
          "string.empty": "PLAN_ID_REQUIRED",
        })
        .required(),
      timezone: Joi.string().optional(),
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
const isValidPhoneInput = (value) => {
  if (typeof value !== "string") return false;
  const digits = value.replace(/\D/g, "");
  return /^\+?[0-9\s\-()]{4,20}$/.test(value) && digits.length >= 4 && digits.length <= 15;
};

const loginIdentifierField = Joi.string()
  .trim()
  .empty("")
  .custom((value, helpers) => {
    const isEmail = !Joi.string().email().validate(value).error;
    if (!isEmail && !isValidPhoneInput(value)) {
      return helpers.message("VALID_EMAIL_OR_PHONE");
    }
    return value;
  })
  .messages({
    "string.base": "VALID_EMAIL_OR_PHONE",
  });

const loginPhoneField = Joi.string()
  .trim()
  .empty("")
  .custom((value, helpers) => {
    if (!isValidPhoneInput(value)) {
      return helpers.message("VALID_PHONE");
    }
    return value;
  })
  .messages({
    "string.base": "VALID_PHONE",
  });

export const loginSchema = {
  body: Joi.object()
    .keys({
      email: loginIdentifierField.optional(),
      phone: loginPhoneField.optional(),
      identifier: loginIdentifierField.optional(),
      emailOrPhone: loginIdentifierField.optional(),
      codeCountry: generalFeilds.codeCountry.empty("").optional(),
      code_country: generalFeilds.codeCountry.empty("").optional(),
      password: generalFeilds.password.required(),
    })
    .or("email", "phone", "identifier", "emailOrPhone")
    .messages({
      "object.missing": "EMAIL_OR_PHONE_REQUIRED",
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

export const saveFCM = {
  body: Joi.object()
    .keys({
      fcmToken: generalFeilds.fcmToken.required().messages({
        "any.required": "FCM_TOKEN_REQUIRED",
        "string.empty": "FCM_TOKEN_REQUIRED",
      }),
    })
    .required(),
};

export const registerTeacherSchema = {
  body: Joi.object()
    .keys({
      name: generalFeilds.name.required(),
      email: generalFeilds.email.required(),
      password: generalFeilds.password.required(),
      comfirmPassword: generalFeilds.confirmPassword.required(),
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
        whatsappNumber: Joi.string().required(),
        birthDate: generalFeilds.birth_date.required(),
        qualification: Joi.string().required(),
        hasPersonalLaptop:Joi.boolean().required(),
        governorate: Joi.string().required(),
        maritalStatus:Joi.string().required(),
        hasCurrentJob:Joi.boolean().required(),
        hasFreeTimeFrom3To8:Joi.boolean().required(),
        dailyFreeTimeHours:Joi.string().required(), 
        niqabDuringSession:Joi.boolean().required(),
onlineTeachingExperience:Joi.string().required(),
        memorizesEntireQuran:Joi.string().required(),
        howDidYouHearAboutUs:Joi.string().required(),
        practicalTajweedLevel:Joi.string().required(),
        theoreticalTajweedLevel:Joi.string().required(),
        otherLanguages:Joi.string().required(),
        agreedToWorkConditions:Joi.boolean().required(),
      }),
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

export const approveTeacherRequestSchema = {
  params: Joi.object({
    userId: generalFeilds.id.required(),
  }),
  body: Joi.object({
    currency_id: generalFeilds.id
      .messages({
        "string.base": "CURRENCY_ID_STRING",
        "string.empty": "CURRENCY_ID_EMPTY",
        "any.required": "CURRENCY_ID_REQUIRED",
      })
      .required(),
    subject_ids: Joi.array()
      .items(
        generalFeilds.id.messages({
          "string.base": "SUBJECT_ID_STRING",
          "string.empty": "SUBJECT_ID_EMPTY",
        }),
      )
      .optional(),
    meeting_link: Joi.string().uri().optional().messages({
      "string.base": "MEETING_LINK_STRING",
      "string.uri": "MEETING_LINK_INVALID_URI",
    }),
    hour_price: Joi.number().positive().optional().messages({
      "number.base": "HOUR_PRICE_MUST_BE_NUMBER",
      "number.positive": "HOUR_PRICE_MUST_BE_POSITIVE",
    }),
  }).required(),
};

export const rejectTeacherRequestSchema = {
  params: Joi.object({
    userId: generalFeilds.id.required(),
  }),
};

export const getTeacherRequestsSchema = {
  query: Joi.object({
    page: generalFeilds.page,
    limit: generalFeilds.limit,
  }),
};



