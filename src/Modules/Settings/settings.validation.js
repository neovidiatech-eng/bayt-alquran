import joi from "joi";

export const updateLateDiscount = {
  body: joi.object({
    lateMinutes: joi.number().integer().min(0).required(),
    discountPercentage: joi.number().min(0).max(100).required(),
  }).required(),
};
