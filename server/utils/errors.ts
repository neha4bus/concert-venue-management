// Centralized error handling utilities

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    if (details) {
      (this as any).details = details;
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests. Please try again later.', 429);
    this.name = 'RateLimitError';
    (this as any).retryAfter = retryAfter;
  }
}

// Error handler middleware
export function handleError(error: Error, isDevelopment: boolean = false) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      message: error.message,
      ...(isDevelopment && { stack: error.stack }),
      ...((error as any).details && { details: (error as any).details }),
      ...((error as any).retryAfter && { retryAfter: (error as any).retryAfter })
    };
  }

  // Log unexpected errors
  console.error('Unexpected error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  return {
    status: 500,
    message: isDevelopment ? error.message : 'Internal Server Error',
    ...(isDevelopment && { stack: error.stack })
  };
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}