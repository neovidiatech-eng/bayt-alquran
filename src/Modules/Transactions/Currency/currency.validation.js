import Joi from "joi";
import { generalFeilds } from "../../../Utils/GeneralFields/index.js";

export const getCurrenciesSchema = {
  query: Joi.object()
    .keys({
      search: generalFeilds.search_Currency.optional(),
    })
    .required(),
};
export const getCurrencyById = {
  query: Joi.object()
    .keys({
      search: generalFeilds.search_Currency.optional(),
    })
    .required(),
};

export const addCurrencySchema = {
  body: Joi.object()
    .keys({
      name_en: generalFeilds.name_en.required(),
      name_ar: generalFeilds.name_ar.required(),
      symbol: generalFeilds.symbol.required(),
      code: generalFeilds.code.required(),
      exchangeRate: generalFeilds.exchangeRate.required(),
    })
    .required(),
};

export const updateCurrencySchema = {
  body: Joi.object()
    .keys({
      name_en: generalFeilds.name_en.optional(),
      name_ar: generalFeilds.name_ar.optional(),
      symbol: generalFeilds.symbol.optional(),
      code: generalFeilds.code.optional(),
      exchangeRate: generalFeilds.exchangeRate.optional(),
      default: generalFeilds.default.optional(),
    })
    .required(),
  params: Joi.object()
    .keys({
      id: Joi.string().uuid().required(),
    })
    .required(),
};
export const deleteCurrencySchema = {
  params: Joi.object()
    .keys({
      id: Joi.string().uuid().required(),
    })
    .required(),
};