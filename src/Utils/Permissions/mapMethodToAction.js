/**
 * Maps HTTP methods to permission actions.
 * 
 * @param {string} method - HTTP Method (GET, POST, etc.)
 * @returns {string} - Corresponding action (read, create, etc.)
 */
export const mapMethodToAction = (method) => {
  const mapping = {
    GET: "read",
    POST: "create",
    PATCH: "update",
    PUT: "update",
    DELETE: "delete",
  };

  return mapping[method.toUpperCase()] || "read";
};
