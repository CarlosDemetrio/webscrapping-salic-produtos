import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
} from '../../src/errors/AppError';

describe('AppError', () => {
  describe('AppError base class', () => {
    it('should create an AppError with default values', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create an AppError with custom status code', () => {
      const error = new AppError('Custom error', 418);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(true);
    });

    it('should create an AppError with custom isOperational flag', () => {
      const error = new AppError('Non-operational error', 500, false);

      expect(error.message).toBe('Non-operational error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });

    it('should maintain correct stack trace', () => {
      const error = new AppError('Stack test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Stack test');
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with status 400', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
      expect(error.isOperational).toBe(true);
    });

    it('should be catchable as Error', () => {
      try {
        throw new ValidationError('Test validation');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as ValidationError).statusCode).toBe(400);
      }
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Recurso não encontrado');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create a NotFoundError with custom message', () => {
      const error = new NotFoundError('Item não encontrado');

      expect(error.message).toBe('Item não encontrado');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Não autorizado');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
    });

    it('should create an UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Token inválido');

      expect(error.message).toBe('Token inválido');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a ForbiddenError with default message', () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Acesso negado');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
    });

    it('should create a ForbiddenError with custom message', () => {
      const error = new ForbiddenError('Sem permissão');

      expect(error.message).toBe('Sem permissão');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError with message', () => {
      const error = new ConflictError('Recurso já existe');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Recurso já existe');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('RateLimitError', () => {
    it('should create a RateLimitError with default message', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Muitas requisições. Tente novamente mais tarde.');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should create a RateLimitError with custom message', () => {
      const error = new RateLimitError('Rate limit excedido');

      expect(error.message).toBe('Rate limit excedido');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('InternalServerError', () => {
    it('should create an InternalServerError with default message', () => {
      const error = new InternalServerError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Erro interno do servidor');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('InternalServerError');
      expect(error.isOperational).toBe(false);
    });

    it('should create an InternalServerError with custom message', () => {
      const error = new InternalServerError('Erro crítico');

      expect(error.message).toBe('Erro crítico');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create a ServiceUnavailableError with default message', () => {
      const error = new ServiceUnavailableError();

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Serviço temporariamente indisponível');
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('ServiceUnavailableError');
      expect(error.isOperational).toBe(false);
    });

    it('should create a ServiceUnavailableError with custom message', () => {
      const error = new ServiceUnavailableError('Banco de dados indisponível');

      expect(error.message).toBe('Banco de dados indisponível');
      expect(error.statusCode).toBe(503);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Error hierarchy', () => {
    it('should maintain proper error inheritance chain', () => {
      const errors = [
        new ValidationError('test'),
        new NotFoundError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new ConflictError('test'),
        new RateLimitError('test'),
        new InternalServerError('test'),
        new ServiceUnavailableError('test'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    it('should differentiate between operational and non-operational errors', () => {
      const operationalErrors = [
        new ValidationError('test'),
        new NotFoundError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new ConflictError('test'),
        new RateLimitError('test'),
      ];

      const nonOperationalErrors = [
        new InternalServerError('test'),
        new ServiceUnavailableError('test'),
      ];

      operationalErrors.forEach(error => {
        expect(error.isOperational).toBe(true);
      });

      nonOperationalErrors.forEach(error => {
        expect(error.isOperational).toBe(false);
      });
    });
  });
});
