import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const renewSubscription = {
  params: Joi.object({
    studentId: generalFeilds.id.required(),
  }),
  body: Joi.object({
    plan_id: generalFeilds.id.required(),
  }),
};
