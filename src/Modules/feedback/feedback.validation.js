import joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const getFeedbacks = {
  query: joi.object().keys({
    page: joi.number().default(1),
    limit: joi.number().default(10),
    search: joi.string().default(""),
  }),
};
export const getFeedback = {
  params: joi
    .object({
      feedback_id: generalFeilds.id.messages({
        "any.required": "FEEDBACK_ID_REQUIRED",
        "string.empty": "FEEDBACK_ID_REQUIRED",
        "string.guid": "FEEDBACK_ID_INVALID",
      }),
    })
    .required(),
};
