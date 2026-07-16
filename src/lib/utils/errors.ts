/**
 * Typed error hierarchy (ARCHITECTURE.md §Error Handling).
 * Throw AppError subclasses — never raw strings.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_FAILED", message, 400, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(action: string) {
    super("FORBIDDEN", `Not authorized to ${action}`, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}
