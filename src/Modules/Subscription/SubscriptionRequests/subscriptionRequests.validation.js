import joi from "joi";
import { generalFeilds } from "../../../Utils/GeneralFields/index.js";
export const getSubscription = {
  query: joi.object({
    search: generalFeilds.search.messages({
      "string.base": "SEARCH_STRING",
      "string.empty": "SEARCH_EMPTY",
      "string.max": "SEARCH_MAX",
    }),
    status: joi.string().valid("pending", "rejected", "approved").messages({
      "string.base": "STATUS_STRING",
      "any.only": "STATUS_PENDING_REJECTED_APPROVED",
    }),
  }),
};
export const changeStatus = {
  params: joi.object({
    id: generalFeilds.id.messages({
      "string.base": "ID_STRING",
      "string.empty": "ID_EMPTY",
      "string.max": "ID_MAX",
    }),
  }),
  body: joi.object({
    status: joi.string().valid("rejected", "approved").required().messages({
      "string.base": "STATUS_STRING",
      "any.only": "STATUS_REJECTED_APPROVED",
    }),
  }),
};
