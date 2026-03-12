import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/AppError';

/**
 * Interface para resposta de erro padronizada
 */
interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    stack?: string;
  };
}

/**
 * Global error handler para Fastify
 * Captura todos os erros e retorna resposta padronizada
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log do erro
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    request.log.error({
      error: error,
      stack: error.stack,
      url: request.url,
      method: request.method,
    }, 'Error occurred');
  } else {
    request.log.error({
      error: error.message,
      url: request.url,
      method: request.method,
    }, 'Error occurred');
  }

  // AppError customizado
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(isDevelopment && { stack: error.stack }),
      },
    };

    return reply.code(error.statusCode).send(response);
  }

  // Erro de validação do Fastify
  if ('validation' in error && error.validation) {
    const response: ErrorResponse = {
      success: false,
      error: {
        name: 'ValidationError',
        message: error.message || 'Erro de validação',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    return reply.code(400).send(response);
  }

  // Erro de rate limit
  if ('statusCode' in error && error.statusCode === 429) {
    const response: ErrorResponse = {
      success: false,
      error: {
        name: 'RateLimitError',
        message: 'Muitas requisições. Tente novamente mais tarde.',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    return reply.code(429).send(response);
  }

  // Erro genérico do Fastify
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const response: ErrorResponse = {
      success: false,
      error: {
        name: error.name || 'Error',
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(isDevelopment && { stack: error.stack }),
      },
    };

    return reply.code(error.statusCode).send(response);
  }

  // Erro interno inesperado (500)
  const response: ErrorResponse = {
    success: false,
    error: {
      name: 'InternalServerError',
      message: isDevelopment ? error.message : 'Erro interno do servidor',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(isDevelopment && { stack: error.stack }),
    },
  };

  return reply.code(500).send(response);
}
