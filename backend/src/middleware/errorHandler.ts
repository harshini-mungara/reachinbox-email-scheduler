import { Request, Response, NextFunction } from 'express';

/**
 * Global Error Handler Middleware
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('💥 Unhandled Route Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: err.name || 'Error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
