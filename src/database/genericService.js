import * as db from "./dbService.js";

/**
 * Ensures an entity exists in the database or throws a 404 error.
 * @param {Object} options
 * @param {string} options.model - Prisma model name
 * @param {Object} options.where - Prisma where clause
 * @param {string} [options.message] - Error message
 * @param {Object} [options.include] - Prisma include clause
 * @returns {Promise<Object>} The found entity
 */
export const ensureExists = async ({ model, where, message = "Resource not found", messageParams = {}, include, isMessageKey = true }) => {
  const item = await db.findOne({ model, where, include });
  if (!item) {
    const error = new Error(message);
    error.cause = 404;
    error.isMessageKey = isMessageKey;
    error.messageParams = messageParams;
    throw error;
  }
  return item;
};

/**
 * Fetches a paginated list of entities with a total count.
 * @param {Object} options
 * @param {string} options.model - Prisma model name
 * @param {Object} [options.where] - Prisma where clause
 * @param {number} [options.page] - Page number (1-indexed)
 * @param {number} [options.limit] - Items per page
 * @param {Object} [options.include] - Prisma include clause
 * @param {Object} [options.orderBy] - Prisma orderBy clause
 * @returns {Promise<Object>} { items, total, totalPages, currentPage }
 */
export const findPaginated = async ({ model, where = {}, page = 1, limit = 10, include, orderBy }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [items, total] = await Promise.all([
    db.findMany({ model, where, skip, take, include, orderBy }),
    db.count({ model, where }),
  ]);

  return {
    items,
    metadata: {
      total,
      totalPages: Math.ceil(total / take),
      currentPage: Number(page),
      limit: Number(limit)
    }
  };
};
