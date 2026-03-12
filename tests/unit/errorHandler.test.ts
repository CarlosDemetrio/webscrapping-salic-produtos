import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { errorHandler } from '../../src/middlewares/errorHandler';
import { AppError, ValidationError, NotFoundError } from '../../src/errors/AppError';

describe('errorHandler', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockRequest = {
      url: '/api/test',
      method: 'GET',
      log: {
        error: jest.fn(),
      } as any,
    };
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('AppError handling', () => {
    it('should handle AppError with correct status code', () => {
      const error = new NotFoundError('Resource not found');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            name: 'NotFoundError',
            message: 'Resource not found',
            statusCode: 404,
            path: '/api/test',
          }),
        })
      );
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new ValidationError('Invalid input');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.error.stack).toBeDefined();
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new ValidationError('Invalid input');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.error.stack).toBeUndefined();
    });
  });

  describe('Fastify validation error handling', () => {
    it('should handle Fastify validation errors', () => {
      const error = {
        validation: [{ message: 'Invalid field' }],
        message: 'Validation failed',
      } as FastifyError;

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            name: 'ValidationError',
            statusCode: 400,
          }),
        })
      );
    });
  });

  describe('Rate limit error handling', () => {
    it('should handle rate limit errors (429)', () => {
      const error = {
        statusCode: 429,
        message: 'Too many requests',
      } as FastifyError;

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            name: 'RateLimitError',
            message: 'Muitas requisições. Tente novamente mais tarde.',
            statusCode: 429,
          }),
        })
      );
    });
  });

  describe('Generic Fastify error handling', () => {
    it('should handle Fastify errors with statusCode', () => {
      const error = {
        statusCode: 404,
        name: 'NotFoundError',
        message: 'Route not found',
      } as FastifyError;

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            statusCode: 404,
            message: 'Route not found',
          }),
        })
      );
    });
  });

  describe('Generic error handling (500)', () => {
    it('should handle unexpected errors as 500 in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Unexpected error');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            name: 'InternalServerError',
            message: 'Erro interno do servidor',
            statusCode: 500,
          }),
        })
      );
    });

    it('should show actual error message in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.error.message).toBe('Detailed error message');
      expect(sendCall.error.stack).toBeDefined();
    });
  });

  describe('Error logging', () => {
    it('should log error with details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: error,
          stack: error.stack,
          url: '/api/test',
          method: 'GET',
        }),
        'Error occurred'
      );
    });

    it('should log error without stack in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          url: '/api/test',
          method: 'GET',
        }),
        'Error occurred'
      );
    });
  });

  describe('Response structure', () => {
    it('should always include timestamp', () => {
      const error = new AppError('Test');
      const beforeTime = new Date().toISOString();

      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.error.timestamp).toBeDefined();
      expect(new Date(sendCall.error.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it('should always include path from request', () => {
      const customRequest: Partial<FastifyRequest> = {
        url: '/api/custom/path',
        method: 'GET',
        log: {
          error: jest.fn(),
        } as any,
      };
      const error = new AppError('Test');

      errorHandler(
        error,
        customRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const sendCall = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sendCall.error.path).toBe('/api/custom/path');
    });
  });
});
