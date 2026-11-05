import Joi from "joi";
import { generalFeilds } from "../../../Utils/GeneralFields/index.js";
export const updateMeetingLink = {
  body: Joi.object()
    .keys({
      meeting_link: generalFeilds.url.required(),
    })
    .required(),
};
