import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const getFeedback = {
  query: Joi.object()
    .keys({
     page: Joi.number().positive().optional(),
     limit: Joi.number().positive().optional(),
     search: Joi.string().optional(),
    })
    .required(),
};

