import express from "express";
import joiToSwagger from "joi-to-swagger";

export function setupSwagger(app, routerMapping = new Map()) {
  // Map of handle -> path to help Express 5 extraction
  // Note: using Map because handles are functions (objects)

  // A helper function to parse regex returned by Express for router paths
  const parseExpressPath = (regexp, keys) => {
    let path = regexp
      .toString()
      .replace("/^\\", "")
      .replace("\\/?(?=\\/|$)/i", "")
      .replace(/\\\//g, "/")
      .replace("/^", "");
      
    // Handle express 5 exact match RegExp
    if (path.endsWith("$/i")) {
        path = path.slice(0, -3);
    }
    if (path.startsWith("/")) path = "" + path;
    else path = "/" + path;

    return path.replace(/\/+/g, '/').replace(/\/$/, '');
  };

    const getSlices = (layer, path = "", tag = null) => {
    let currentPath = path;
    let currentTag = tag;

    // For router layers (app.use('/base', router) or router.use('/base', subRouter))
    if (layer.handle && layer.handle.stack) {
      let basePathString = layer.regexp ? parseExpressPath(layer.regexp, layer.keys) : "";
      
      // Fix for Express 5: try to get path from our mapping
      if (!basePathString || basePathString === "/") {
          if (routerMapping.has(layer.handle)) {
              basePathString = routerMapping.get(layer.handle);
          }
      }

      if (basePathString && basePathString !== "/") {
          currentPath += basePathString;
          // Set tag from the first meaningful path segment if not already set
          if (!currentTag) {
              currentTag = basePathString.replace(/^\/+/, '').split('/')[0];
              currentTag = currentTag.charAt(0).toUpperCase() + currentTag.slice(1);
          }
      }
      
      let routes = [];
      layer.handle.stack.forEach((subLayer) => {
        routes = routes.concat(getSlices(subLayer, currentPath, currentTag));
      });
      return routes;
    }

    // For route layers (router.get('/endpoint', ...))
    if (layer.route) {
      const endpointsPath = currentPath + (layer.route.path === "/" ? "" : layer.route.path);
      const methods = Object.keys(layer.route.methods).filter(m => m !== '_all').map(m => m.toLowerCase());
      
      let schema = null;
      if (layer.route.stack) {
        layer.route.stack.forEach((routeLayer) => {
          if (routeLayer.handle && routeLayer.handle.schema) {
            schema = routeLayer.handle.schema;
          }
        });
      }

      return [{
        path: endpointsPath,
        methods,
        schema,
        tag: currentTag
      }];
    }

    return [];
  };

  const rawRoutes = [];
  const routerStack = app.router ? app.router.stack : app._router.stack;
  routerStack.forEach((layer, i) => {
    const slices = getSlices(layer);
    rawRoutes.push(...slices);
  });

  // Convert raw routes to Swagger JSON paths
  const paths = {};
  
  rawRoutes.forEach(r => {
      // Reformat express path params :id to swagger {id}
      let swaggerPath = r.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      if (swaggerPath === "") swaggerPath = "/";

      if (!paths[swaggerPath]) Object.assign(paths, { [swaggerPath]: {} });

      r.methods.forEach(method => {
          const operation = {
              summary: `${method.toUpperCase()} ${swaggerPath}`,
              tags: r.tag ? [r.tag] : ["General"],
              responses: {
                  200: { description: "Success" }
              },
              parameters: [],
              requestBody: undefined
          };

          if (r.schema) {
              // Convert Joi to Swagger
              if (r.schema.params) {
                  const { swagger } = joiToSwagger(r.schema.params);
                  for (const [key, value] of Object.entries(swagger.properties || {})) {
                      operation.parameters.push({
                          name: key,
                          in: "path",
                          required: swagger.required ? swagger.required.includes(key) : false,
                          schema: value
                      });
                  }
              }
              if (r.schema.query) {
                  const { swagger } = joiToSwagger(r.schema.query);
                  for (const [key, value] of Object.entries(swagger.properties || {})) {
                      operation.parameters.push({
                          name: key,
                          in: "query",
                          required: swagger.required ? swagger.required.includes(key) : false,
                          schema: value
                      });
                  }
              }
              if (r.schema.body) {
                  const { swagger } = joiToSwagger(r.schema.body);
                  operation.requestBody = {
                      content: {
                          "application/json": {
                              schema: swagger
                          }
                      }
                  };
              }
          } else {
             // Try to infer parameters from path / {id}
             const paramMatches = swaggerPath.match(/\{([a-zA-Z0-9_]+)\}/g);
             if (paramMatches) {
                 paramMatches.forEach(match => {
                     const name = match.replace(/[{}]/g, '');
                     // check if not already added
                     if (!operation.parameters.find(p => p.name === name)) {
                        operation.parameters.push({
                            name,
                            in: "path",
                            required: true,
                            schema: { type: "string" }
                        });
                     }
                 });
             }
          }

          paths[swaggerPath][method] = operation;
      });
  });

  return {
    openapi: "3.0.0",
    info: {
      title: "Jipter Backend API",
      version: "1.0.0",
      description: "Auto-generated Swagger documentation including exact Joi validations"
    },
    servers: [
      {
        url: "http://46.21.250.194:3009",
        description: "Production Server"
      },
      {
        url: "https://perfect-due.com",
        description: "Local Development"
      }
    ],
    paths,
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    },
    security: [{ bearerAuth: [] }]
  };
}
