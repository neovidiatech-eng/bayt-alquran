import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";
import { ExpensesStatus, ExpensesType } from "../../Utils/Enums/expenses.js";

export const getExpensesValidation = {
  query: Joi.object()
    .keys({
      search: generalFeilds.search.optional(),
      status: Joi.string()
        .valid(
          ...Object.values(ExpensesStatus)
        )
        .optional(),
      type: Joi.string()
        .valid(
          ...Object.values(ExpensesType)
        )
        .optional(),
      page: Joi.number().integer().min(1).optional(),
      currencyCode: Joi.string().optional(),
      limit: Joi.number().integer().min(1).optional(),
    })
    .required(),
};

export const getExpenseByIdValidation = {
  params: Joi.object().keys({
    id: generalFeilds.id.required(),
  }).required(),
};

export const createExpenseValidation = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    currencyId: generalFeilds.id.required(),
    amount: Joi.number().positive().required(),
    payment_type: Joi.string().required(),
    type: Joi.string()
      .valid(...Object.values(ExpensesType))
      .required(),
    status: Joi.string()
      .valid(...Object.values(ExpensesStatus))
      .required(),
    date: Joi.date().iso().required(),
  }).required(),
};

export const updateExpenseValidation = {
  params: Joi.object().keys({
    id: generalFeilds.id.required(),
  }).required(),
  body: Joi.object().keys({
    title: Joi.string().optional(),
    currencyId: generalFeilds.id.optional(),
    amount: Joi.number().positive().optional(),
    payment_type: Joi.string().optional(),
    type: Joi.string().valid(...Object.values(ExpensesType)).optional(),
    status: Joi.string().valid(...Object.values(ExpensesStatus)).optional(),
    date: Joi.date().iso().optional(),
  }).min(1).optional(),
};

export const deleteExpenseValidation = {
  params: Joi.object().keys({
    id: generalFeilds.id.required(),
  }).required(),
};
