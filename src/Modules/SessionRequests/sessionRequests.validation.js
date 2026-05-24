import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createRequest = {
  body: Joi.object({
    sessionId: generalFeilds.id.optional(),
    type: Joi.string()
      .valid("reschedule", "cancel", "absence_correction", "new_session")
      .required(),
    reason: Joi.string().min(5).max(500).required(),
    requestedData: Joi.object({
      new_start_time: generalFeilds.date.optional(),
      new_end_time: generalFeilds.date.optional(),
      new_status: Joi.string().valid("completed", "missed").optional(),
      suggested_notes: Joi.string().optional(),
      // Fields for new_session if no initial sessionId
      studentId: generalFeilds.id.optional(),
      teacherId: generalFeilds.id.optional(),
      subjectId: generalFeilds.id.optional(),
      title: Joi.string().optional(),
    }).optional(),
  }).required(),
};

export const handleRequest = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }).required(),
  body: Joi.object({
    adminNotes: Joi.string().max(500).optional(),
  }).required(),
};
