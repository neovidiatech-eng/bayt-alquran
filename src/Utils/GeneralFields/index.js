import Joi from "joi";

export const validateInternationalPhoneLength = ({
  phoneKey = "phone",
  codeCountryKey = "codeCountry",
} = {}) => {
  return (value, helpers) => {
    const phone = value?.[phoneKey];
    const codeCountry = value?.[codeCountryKey];

    if (!phone || !codeCountry) return value;

    const codeDigits = codeCountry.replace("+", "");
    if (codeDigits.length + phone.length > 15) {
      return helpers.error("phone.e164Length");
    }

    return value;
  };
};

export const generalFeilds = {
  role_name: Joi.string().min(3).max(15).messages({
    "string.base": "Role name must be a string",
    "string.empty": "Role name cannot be empty",
    "string.min": "Role name must be at least {#limit} characters",
    "string.max": "Role name must be at most {#limit} characters",
    "any.required": "Role name is required",
  }),
  url: Joi.string().uri(),
  fcmToken: Joi.string().min(50).max(500),

  permission_name: Joi.string().min(3).max(32).messages({
    "string.base": "Permission name must be a string",
    "string.empty": "Permission name cannot be empty",
    "string.min": "Permission name must be at least {#limit} characters",
    "string.max": "Permission name must be at most {#limit} characters",
    "any.required": "Permission name is required",
  }),
  permission_code: Joi.string()
    .min(3)
    .max(32)
    .pattern(new RegExp("^[A-Z]+_[A-Z]+$"))
    .messages({
      "string.base": "Permission code must be a string",
      "string.empty": "Permission code cannot be empty",

      "string.pattern.base":
        "Permission code must be in the format 'ACTION_NAME' (e.g. CREATE_USER)",

      "string.min": "Permission code must be at least {#limit} characters",
      "string.max": "Permission code must be at most {#limit} characters",
      "any.required": "Permission code is required",
    }),
  name: Joi.string().min(3).max(32).messages({
    "string.base": "Name must be a string",
    "string.empty": "Name cannot be empty",
    "string.min": "Name must be at least {#limit} characters",
    "string.max": "Name must be at most {#limit} characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().messages({
    "string.base": "Email must be a string",
    "string.empty": "Email cannot be empty",
    "string.email": "Please enter a valid email address",
    "any.required": "Email is required",
  }),
  hourPrice: Joi.number().min(0).messages({
    "number.base": "HOUR_PRICE_MUST_BE_NUMBER",
    "number.min": "HOUR_PRICE_MUST_BE_POSITIVE",
    "any.required": "HOUR_PRICE_REQUIRED",
  }),
  password: Joi.string()
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#])[A-Za-z\\d@$!%*?&^#]{8,}$",
      ),
    )
    .messages({
      "string.base": "Password must be a string",
      "string.empty": "Password cannot be empty",
      "string.pattern.base":
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&^#)",
      "any.required": "Password is required",
    }),
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Confirm password must match the password",
    "any.required": "Confirm password is required",
  }),
  gender: Joi.string().valid("male", "female").messages({
    "string.base": "Gender must be a string",
    "string.empty": "Gender cannot be empty",
    "any.only": "Gender must be either 'male' or 'female'",
    "any.required": "Gender is required",
  }),
  birth_date: Joi.date().iso().messages({
    "date.base": "Birth date must be a valid date",
    "date.empty": "Birth date cannot be empty",
    "date.format": "Birth date must be in ISO format",
    "any.required": "Birth date is required",
  }),
  date: Joi.date().iso(),
  country: Joi.string().messages({
    "string.base": "Country must be a string",
    "string.empty": "Country cannot be empty",
    "any.required": "Country is required",
  }),
  nationality: Joi.string().messages({
    "string.base": "Nationality must be a string",
    "string.empty": "Nationality cannot be empty",
    "any.required": "Nationality is required",
  }),
  age: Joi.number().required().messages({
    "number.base": "Age must be a number",
    "number.empty": "Age cannot be empty",
    "any.required": "Age is required",
  }),
  city: Joi.string().optional().messages({
    "string.base": "City must be a string",
    "string.empty": "City cannot be empty",
  }),
  phone: Joi.string()
    .pattern(/^[0-9]{4,14}$/)
    .messages({
      "string.base": "Phone number must be a string",
      "string.empty": "Phone number cannot be empty",
      "string.pattern.base":
        "Phone must contain national digits only, without country code, spaces, or symbols",
      "any.required": "Phone number is required",
    }),
  idToken: Joi.string().messages({
    "string.base": "ID token must be a string",
    "string.empty": "ID token cannot be empty",
    "any.required": "ID token is required",
  }),
  provider: Joi.string().valid("google", "local").messages({
    "string.base": "Provider must be a string",
    "string.empty": "Provider cannot be empty",
    "any.only": "Provider must be either 'google' or 'local'",
    "any.required": "Provider is required",
  }),
  otp: Joi.string()
    .max(6)
    .min(6)
    .regex(/^[0-9]{6}$/)
    .messages({
      "string.base": "OTP must be a string",
      "string.empty": "OTP cannot be empty",
      "string.min": "OTP must be exactly {#limit} digits",
      "string.max": "OTP must be exactly {#limit} digits",
      "string.pattern.base": "OTP must contain only numbers",
      "any.required": "OTP is required",
    }),
  // bio: Joi.string().min(16).max(300).messages({
  //   "string.base": "Bio must be a string",
  //   "string.empty": "Bio cannot be empty",
  //   "string.min": "Bio must be at least {#limit} characters",
  //   "string.max": "Bio must be at most {#limit} characters",
  //   "any.required": "Bio is required",
  // }),
  search: Joi.string().max(32).allow("", null).messages({
    "string.base": "Search query must be a string",
    "string.empty": "Search query cannot be empty",
    "string.max": "Search query must be at most {#limit} characters",
    "any.required": "Search query is required",
  }),
  search_Currency: Joi.string().max(32).messages({
    "string.base": "Search query must be a string",
    "string.empty": "Search query cannot be empty",
    "string.max": "Search query must be at most {#limit} characters",
    "any.required": "Search query is required",
  }),
  orderBy:Joi.string().optional().messages({
    "string.base": "Order by must be a string",
    "string.empty": "Order by cannot be empty",
    "any.required": "Order by is required",
  }),
  order: Joi.string().valid("asc", "desc").optional().messages({
    "string.base": "Order must be a string",
    "string.empty": "Order cannot be empty",
    "any.only": "Order must be either 'asc' or 'desc'",
    "any.required": "Order is required",
  }),
  file: {
    fieldname: Joi.string().required().messages({
      "string.base": "File field name must be a string",
      "string.empty": "File field name cannot be empty",
      "any.required": "File field name is required",
    }),
    originalname: Joi.string().required().messages({
      "string.base": "Original file name must be a string",
      "string.empty": "Original file name cannot be empty",
      "any.required": "Original file name is required",
    }),
    encoding: Joi.string().required().messages({
      "string.base": "File encoding must be a string",
      "string.empty": "File encoding cannot be empty",
      "any.required": "File encoding is required",
    }),
    mimetype: Joi.string().required().messages({
      "string.base": "File MIME type must be a string",
      "string.empty": "File MIME type cannot be empty",
      "any.required": "File MIME type is required",
    }),
    finalPath: Joi.string().required().messages({
      "string.base": "File final path must be a string",
      "string.empty": "File final path cannot be empty",
      "any.required": "File final path is required",
    }),
    destination: Joi.string().required().messages({
      "string.base": "File destination must be a string",
      "string.empty": "File destination cannot be empty",
      "any.required": "File destination is required",
    }),
    filename: Joi.string().required().messages({
      "string.base": "Filename must be a string",
      "string.empty": "Filename cannot be empty",
      "any.required": "Filename is required",
    }),
    path: Joi.string().required().messages({
      "string.base": "File path must be a string",
      "string.empty": "File path cannot be empty",
      "any.required": "File path is required",
    }),
    size: Joi.number().positive().required().messages({
      "number.base": "File size must be a number",
      "number.positive": "File size must be a positive number",
      "any.required": "File size is required",
    }),
  },
  codeCountry: Joi.string()
    .pattern(/^\+[1-9]\d{0,2}$/)
    .messages({
      "string.base": "Code country must be a string",
      "string.empty": "Code country cannot be empty",
      "string.pattern.base":
        "Code country must be an international prefix like +1, +20, +44, or +966",
      "any.required": "Code country is required",
    }),
  name_en: Joi.string().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name cannot be empty",
    "any.required": "Name is required",
  }),
  name_ar: Joi.string().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name cannot be empty",
    "any.required": "Name is required",
  }),
  symbol: Joi.string().messages({
    "string.base": "Symbol must be a string",
    "string.empty": "Symbol cannot be empty",
    "any.required": "Symbol is required",
  }),
  code: Joi.string().messages({
    "string.base": "Code must be a string",
    "string.empty": "Code cannot be empty",
    "any.required": "Code is required",
  }),
  exchangeRate: Joi.number().messages({
    "number.base": "Exchange rate must be a number",
    "number.empty": "Exchange rate cannot be empty",
    "any.required": "Exchange rate is required",
  }),
  default: Joi.boolean().messages({
    "boolean.base": "Default must be a boolean",
    "boolean.empty": "Default cannot be empty",
    "any.required": "Default is required",
  }),

  description: Joi.string().messages({
    "string.base": "Description must be a string",
    "string.empty": "Description cannot be empty",
    "any.required": "Description is required",
  }),
  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be a positive number",
    "any.required": "Price is required",
  }),
  duration: Joi.number().positive().required().messages({
    "number.base": "Duration must be a number",
    "number.positive": "Duration must be a positive number",
    "any.required": "Duration is required",
  }),
  sessionsCount: Joi.number().positive().required().messages({
    "number.base": "Sessions count must be a number",
    "number.positive": "Sessions count must be a positive number",
    "any.required": "Sessions count is required",
  }),
  sessionTime: Joi.number().positive().required().messages({
    "number.base": "Session time must be a number",
    "number.positive": "Session time must be a positive number",
    "any.required": "Session time is required",
  }),
  active: Joi.boolean().required().messages({
    "boolean.base": "Active must be a boolean",
    "boolean.empty": "Active cannot be empty",
    "any.required": "Active is required",
  }),
  bestSeller: Joi.boolean().required().messages({
    "boolean.base": "Best seller must be a boolean",
    "boolean.empty": "Best seller cannot be empty",
    "any.required": "Best seller is required",
  }),
  type: Joi.string().valid("full", "half").required().messages({
    "string.base": "Type must be a string",
    "string.empty": "Type cannot be empty",
    "any.required": "Type is required",
    "any.only": "Type must be either 'full' or 'half'",
  }),
  features: Joi.array().items(Joi.string()).required().messages({
    "array.base": "Features must be an array",
    "array.empty": "Features cannot be empty",
    "any.required": "Features is required",
  }),
  id: Joi.string().uuid(),
  parent_recurring_id: Joi.string()
    .pattern(/^rec_.{10}$/)
    .required()
    .messages({
      "string.empty": "parent_recurring_id is required",
      "any.required": "parent_recurring_id is required",
      "string.pattern.base": "parent_recurring_id must be a valid recurring id",
    }),
  color: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .messages({
      "string.base": "Color must be a string",
      "string.empty": "Color cannot be empty",
      "string.pattern.base": "Color must be a valid hex color",
      "any.required": "Color is required",
    }),
  page: Joi.number().integer().min(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
    "any.required": "Page is required",
  }),
  limit: Joi.number().integer().min(1).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "any.required": "Limit is required",
  }),
};
