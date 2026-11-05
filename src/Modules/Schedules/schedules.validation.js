import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";
import { notificationType } from "../../Utils/Enums/sessions.js";

export const createSchedule = {
  body: Joi.object()
    .keys({
      studentId: generalFeilds.id
        .messages({
          "string.empty": "STUDENT_ID_REQUIRED",
          "any.required": "STUDENT_ID_REQUIRED",
          "string.pattern.base": "STUDENT_ID_INVALID",
        })
        .required(),
      teacherId: generalFeilds.id
        .messages({
          "string.empty": "TEACHER_ID_REQUIRED",
          "any.required": "TEACHER_ID_REQUIRED",
          "string.pattern.base": "TEACHER_ID_INVALID",
        })
        .required(),
      subject_id: generalFeilds.id
        .messages({
          "string.empty": "SUBJECT_ID_REQUIRED",
          "any.required": "SUBJECT_ID_REQUIRED",
          "string.pattern.base": "SUBJECT_ID_INVALID",
        })
        .required(),
      title: generalFeilds.name
        .messages({
          "string.empty": "TITLE_REQUIRED",
          "any.required": "TITLE_REQUIRED",
          "string.pattern.base": "TITLE_INVALID",
        })
        .required(),
      description: generalFeilds.description
        .messages({
          "string.empty": "DESCRIPTION_REQUIRED",
          "any.required": "DESCRIPTION_REQUIRED",
          "string.pattern.base": "DESCRIPTION_INVALID",
        })
        .required(),
      link: generalFeilds.url
        .messages({
          "string.empty": "LINK_REQUIRED",
          "any.required": "LINK_REQUIRED",
          "string.pattern.base": "LINK_INVALID",
        })
        .required(),
      notes: generalFeilds.description.messages({
        "string.empty": "NOTES_REQUIRED",
        "any.required": "NOTES_REQUIRED",
        "string.pattern.base": "NOTES_INVALID",
      }),

      start_time: generalFeilds.date.greater("now").messages({
        "string.empty": "START_TIME_REQUIRED",
        "any.required": "START_TIME_REQUIRED",
        "string.pattern.base": "START_TIME_INVALID",
      }),
      notification_Time: Joi.string()
        .valid(...Object.values(notificationType))
        .required()
        .messages({
          "string.empty": "NOTIFICATION_TIME_REQUIRED",
          "any.required": "NOTIFICATION_TIME_REQUIRED",
          "string.pattern.base": "NOTIFICATION_TIME_INVALID",
        }),
    })
    .required(),
};

export const createRecurringSchedule = {
  body: Joi.object()
    .keys({
      studentId: generalFeilds.id.required(),
      teacherId: generalFeilds.id.required(),
      subject_id: generalFeilds.id.required(),
      title: generalFeilds.name.required(),
      description: generalFeilds.description.required(),
      link: generalFeilds.url.required(),
      notes: generalFeilds.description,
      startTime: Joi.string()
        .regex(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .required()
        .messages({
          "string.pattern.base": "START_TIME_FORMAT",
        }),
      days: Joi.array()
        .items(
          Joi.string().valid(
            "Saturday",
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ),
        )
        .min(1)
        .required(),
      startDate: Joi.date().iso().greater("now").required(),
      endDate: Joi.date().iso().min(Joi.ref("startDate")).greater("now"),
      count: Joi.number().integer().min(1),
      notification_Time: Joi.string()
        .valid(...Object.values(notificationType))
        .required(),
    })
    .required(),
};

export const updateSchedule = {
  body: Joi.object()
    .keys({
      title: generalFeilds.name,
      description: generalFeilds.description,
      link: generalFeilds.url,
      notes: generalFeilds.description,
      status: Joi.string().valid("planned", "completed", "missed", "cancelled"),
      start_time: Joi.date().greater("now"),

      notification_Time: Joi.string().valid(...Object.values(notificationType)),
    })
    .min(1)
    .required(),
  params: Joi.object()
    .keys({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const updateRecurringGroup = {
  body: Joi.object()
    .keys({
      title: generalFeilds.name,
      description: generalFeilds.description,
      link: generalFeilds.url,
      notes: generalFeilds.description,
      status: Joi.string().valid("planned", "completed", "missed", "cancelled"),
      startTime: Joi.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/),
      notification_Time: Joi.string().valid(...Object.values(notificationType)),
    })
    .min(1)
    .required(),
  params: Joi.object()
    .keys({
      parent_recurring_id: generalFeilds.parent_recurring_id.required(),
    })
    .required(),
};

export const getTeacherSchedules = {
  params: Joi.object()
    .keys({
      teacherId: generalFeilds.id
        .messages({
          "string.empty": "TEACHER_ID_REQUIRED",
          "any.required": "TEACHER_ID_REQUIRED",
          "string.pattern.base": "TEACHER_ID_INVALID",
        })
        .required(),
    })
    .required(),
};
export const getStudentSchedules = {
  params: Joi.object()
    .keys({
      studentId: generalFeilds.id.messages({
        "string.empty": "STUDENT_ID_REQUIRED",
        "any.required": "STUDENT_ID_REQUIRED",
        "string.pattern.base": "STUDENT_ID_INVALID",
      }),
    })
    .required(),
};

export const deleteSchedule = {
  params: Joi.object().keys({
    id: generalFeilds.id.required(),
  }),
};
export const deleteRecurringGroup = {
  params: Joi.object().keys({
    parent_recurring_id: generalFeilds.parent_recurring_id.required(),
  }),
};

export const submitReview = {
  body: Joi.object()
    .keys({
      rating: Joi.number().min(1).max(5).required(),
      comment: generalFeilds.description.required(),
      teacherAttended: Joi.boolean().optional(),
      studentAttended: Joi.boolean().optional(),
    })
    .required(),
  params: Joi.object()
    .keys({
      id: generalFeilds.id.required(),
    })
    .required(),
};

export const joinSession = {
  params: Joi.object()
    .keys({
      id: generalFeilds.id
        .messages({
          "string.empty": "ID_REQUIRED",
          "any.required": "ID_REQUIRED",
          "string.pattern.base": "ID_INVALID",
        })
        .required(),
    })
    .required(),
};

export const leaveSession = {
  params: Joi.object()
    .keys({
      id: generalFeilds.id
        .messages({
          "string.empty": "ID_REQUIRED",
          "any.required": "ID_REQUIRED",
          "string.pattern.base": "ID_INVALID",
        })
        .required(),
    })
    .required(),
};
