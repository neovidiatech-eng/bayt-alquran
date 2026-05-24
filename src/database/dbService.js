import prisma from "./Connection.db.js";

const getClient = (model, prismaClient = prisma) => {
  const client = prismaClient[model];
  if (!client) {
    throw new Error(`Model Not Found: "${model}"`);
  }
  return client;
};

/**
 * Creates a db-style wrapper around a Prisma interactive transaction client.
 * This lets controllers use tx.findFirst(), tx.create(), tx.updateOne(), etc.
 */
const createTxWrapper = (prismaClient) => ({
  findMany: ({ model, where = {}, include, select, orderBy }) =>
    getClient(model, prismaClient).findMany({
      where,
      ...(orderBy ? { orderBy } : {}),
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  findOne: ({ model, where, include, select }) =>
    getClient(model, prismaClient).findUnique({
      where,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  findFirst: ({ model, where, include, select }) =>
    getClient(model, prismaClient).findFirst({
      where,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  create: ({ model, data, include, select }) =>
    getClient(model, prismaClient).create({
      data,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),
  createMany: ({ model, data, include, select }) =>
    getClient(model, prismaClient).createMany({
      data,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  updateOne: ({ model, where, data, include, select }) =>
    getClient(model, prismaClient).update({
      where,
      data,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  updateMany: ({ model, where, data }) =>
    getClient(model, prismaClient).updateMany({ where, data }),

  upsertOne: ({ model, where, update, create, include, select }) =>
    getClient(model, prismaClient).upsert({
      where,
      update,
      create,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  deleteMany: ({ model, where = {} }) =>
    getClient(model, prismaClient).deleteMany({ where }),

  deleteOne: ({ model, where = {}, include, select }) =>
    getClient(model, prismaClient).delete({
      where,
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    }),

  count: ({ model, where = {} }) =>
    getClient(model, prismaClient).count({ where }),
});

/**
 * Supports two calling styles:
 *   1. Array  → db.transaction([db.create(...), db.updateOne(...)])
 *   2. Callback → db.transaction(async (tx) => { await tx.create(...); })
 */
export const transaction = async (actionsOrCallback) => {
  if (typeof actionsOrCallback === "function") {
    return await prisma.$transaction(async (prismaClient) => {
      const tx = createTxWrapper(prismaClient);
      return await actionsOrCallback(tx);
    });
  }
  return await prisma.$transaction(actionsOrCallback);
};
export const findMany = ({
  model,
  where = {},
  include,
  select,
  orderBy,
  take,
  skip,
}) => {
  return getClient(model).findMany({
    where,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
    ...(orderBy ? { orderBy } : {}),
    ...(take ? { take } : {}),
    ...(skip ? { skip } : {}),
  });
};

export const findManyWithPaginationAndCount = async ({
  model,
  where = {},
  page = 1,
  limit = 20,
  orderBy = { createdAt: "desc" },
  select,
  include,
}) => {
  const client = getClient(model);

  const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const p = Math.max(Number(page) || 1, 1);
  const skip = (p - 1) * take;

  const [items, totalItems] = await Promise.all([
    client.findMany({
      where,
      take,
      skip,
      orderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
    }),
    client.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / take);
  const hasNextPage = p < totalPages;

  return {
    items,
    pagination: { page: p, limit: take, totalItems, totalPages, hasNextPage },
  };
};

export const create = ({ model, data, include, select }) => {
  return getClient(model).create({
    data,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};
export const createMany = ({ model, data, include, select }) => {
  return getClient(model).createMany({
    data,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};

export const findOne = ({ model, where, include, select }) => {
  return getClient(model).findUnique({
    where,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};

export const findFirst = ({ model, where, include, select }) => {
  return getClient(model).findFirst({
    where,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};
export const updateOne = ({ model, where, data, include, select }) => {
  return getClient(model).update({
    where,
    data,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};

export const updateMany = ({ model, where, data }) => {
  return getClient(model).updateMany({ where, data });
};

export const upsertOne = ({
  model,
  where,
  update,
  create,
  include,
  select,
}) => {
  return getClient(model).upsert({
    where,
    update,
    create,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};

export const deleteMany = ({ model, where = {} }) => {
  return getClient(model).deleteMany({ where });
};
export const deleteOne = ({ model, where = {}, include, select }) => {
  return getClient(model).delete({
    where,
    ...(include ? { include } : {}),
    ...(select ? { select } : {}),
  });
};

export const count = ({ model, where = {} }) => {
  return getClient(model).count({ where });
};

export const groupBy = ({
  model,
  by,
  where,
  _count,
  _sum,
  _avg,
  _min,
  _max,
}) => {
  return getClient(model).groupBy({
    by,
    ...(where ? { where } : {}),
    ...(_count ? { _count } : {}),
    ...(_sum ? { _sum } : {}),
    ...(_avg ? { _avg } : {}),
    ...(_min ? { _min } : {}),
    ...(_max ? { _max } : {}),
  });
};

