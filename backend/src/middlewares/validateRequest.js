export const validateRequest = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    if (schemas.query) {
      const parsedQuery = schemas.query.parse(req.query);
      try {
        req.query = parsedQuery;
      } catch {
        Object.defineProperty(req, "query", {
          value: parsedQuery,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }

    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }

    next();
  } catch (error) {
    next(error);
  }
};
