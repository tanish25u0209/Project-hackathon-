'use strict';

/**
 * Base application error. All custom errors extend this.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes expected errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ProviderError extends AppError {
  constructor(provider, message, details = null) {
    super(`[${provider}] ${message}`, 502, 'PROVIDER_ERROR', details);
    this.provider = provider;
  }
}

class ProviderTimeoutError extends ProviderError {
  constructor(provider) {
    super(provider, 'Provider request timed out');
    this.code = 'PROVIDER_TIMEOUT';
  }
}

class EmbeddingError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'EMBEDDING_ERROR', details);
  }
}

class ParseError extends AppError {
  constructor(provider, message, rawResponse = null) {
    super(`[${provider}] JSON parse/validation failed: ${message}`, 502, 'PARSE_ERROR');
    this.provider = provider;
    this.rawResponse = rawResponse;
  }
}

class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ProviderError,
  ProviderTimeoutError,
  EmbeddingError,
  ParseError,
  DatabaseError,
};
