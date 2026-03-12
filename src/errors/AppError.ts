/**
 * Classe base para erros customizados da aplicação
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação (400)
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Erro de não encontrado (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Erro de não autorizado (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Erro de proibido (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Erro de conflito (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Erro de too many requests (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Erro interno do servidor (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500, false);
    this.name = 'InternalServerError';
  }
}

/**
 * Erro de serviço indisponível (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Serviço temporariamente indisponível') {
    super(message, 503, false);
    this.name = 'ServiceUnavailableError';
  }
}
