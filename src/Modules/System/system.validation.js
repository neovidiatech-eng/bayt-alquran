import Joi from "joi";
import { generalFeilds } from "../../Utils/GeneralFields/index.js";

export const createRoleSchema = {
  body: Joi.object({
    name: generalFeilds.role_name.required(),
    permissionIds: Joi.array().items(generalFeilds.id).required().messages({
      "array.base": "PERMISSIONS_MUST_BE_ARRAY",
      "any.required": "PERMISSIONS_REQUIRED",
    }),
  }).required(),
};

export const updateRoleSchema = {
  body: Joi.object({
    name: generalFeilds.role_name.required(),
  }).required(),
  params: Joi.object({
    id: generalFeilds.id.required(),
  }).required(),
};

export const deleteRoleSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }).required(),
};
export const assignRoleSchema = {
  params: Joi.object({
    user_id: generalFeilds.id
      .messages({
        "string.empty": "USER_ID_REQUIRED",
        "any.required": "USER_ID_REQUIRED",
      })
      .required(),
  }).required(),
  body: Joi.object({
    role_id: generalFeilds.id
      .messages({
        "string.empty": "ROLE_ID_REQUIRED",
        "any.required": "ROLE_ID_REQUIRED",
      })
      .required(),
  }).required(),
};
export const createPermissionSchema = {
  body: Joi.object({
    name: generalFeilds.permission_name.required(),
    resource: generalFeilds.permission_name.required(),
    method: generalFeilds.permission_name.required(),
  }).required(),
};

export const deletePermissionSchema = {
  params: Joi.object({
    id: generalFeilds.id.required(),
  }).required(),
};

export const assignPermissionsToRoleSchema = {
  body: Joi.object({
    roleId: generalFeilds.id.required(),
    permissionIds: Joi.array().items(generalFeilds.id).required(),
  }).required(),
};

export const revokePermissionsFromRoleSchema = {
  body: Joi.object({
    roleId: generalFeilds.id.required(),
    permissionIds: Joi.array().items(generalFeilds.id).required(),
  }).required(),
};
