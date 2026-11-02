import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@convocart/contracts';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;

  constructor(code: string, message: string, statusCode = 400, retryable = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * Centralized Fastify error handler conforming to Handshake / ConvoCart C1 contract:
 * { "error": { "code": "SNAKE_CASE", "message": "...", "retryable": boolean } }
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  // 1. Handled App Errors
  if (error instanceof AppError) {
    const payload: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      },
    };
    reply.status(error.statusCode).send(payload);
    return;
  }

  // 2. Zod Validation Errors
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue
      ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
      : 'Invalid request payload';

    const payload: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message,
        retryable: false,
      },
    };
    reply.status(400).send(payload);
    return;
  }

  // 3. Fastify Validation Errors (e.g. JSON parse failure)
  if ('validation' in error && error.validation) {
    const payload: ApiErrorResponse = {
      error: {
        code: 'BAD_REQUEST',
        message: error.message,
        retryable: false,
      },
    };
    reply.status(400).send(payload);
    return;
  }

  // 4. Fallback for unhandled internal server errors (never leak stack trace)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    console.error('Unhandled internal server error:', error);
  }

  const payload: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again.',
      retryable: true,
    },
  };
  reply.status(500).send(payload);
}
