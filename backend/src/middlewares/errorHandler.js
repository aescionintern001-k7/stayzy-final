export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;

  const response = {
    success: false,
    message: err.message || "Internal server error",
  };

  if (err.name === "ZodError") {
    statusCode = 400;
    response.message = "Validation failed";
    response.errors = err.issues;
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
