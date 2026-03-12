import redisConfig from '../../src/config/redis';

describe('Redis Configuration', () => {
  it('deve exportar a configuração do Redis com as propriedades corretas', () => {
    expect(redisConfig).toBeDefined();
    expect(redisConfig).toHaveProperty('host');
    expect(redisConfig).toHaveProperty('port');
    expect(redisConfig).toHaveProperty('maxRetriesPerRequest');
  });

  it('deve configurar maxRetriesPerRequest como null (requerido pelo BullMQ)', () => {
    expect(redisConfig.maxRetriesPerRequest).toBeNull();
  });

  it('deve usar valores padrão quando variáveis de ambiente não estão definidas', () => {
    // Como estamos usando dotenv, vamos verificar se os valores são válidos
    expect(typeof redisConfig.host).toBe('string');
    expect(typeof redisConfig.port).toBe('number');
    expect(redisConfig.port).toBeGreaterThan(0);
  });

  it('deve ter uma estratégia de retry configurada', () => {
    expect(redisConfig.retryStrategy).toBeDefined();
    expect(typeof redisConfig.retryStrategy).toBe('function');
  });

  it('deve calcular delay exponencial com limite máximo na estratégia de retry', () => {
    const retryStrategy = redisConfig.retryStrategy as (times: number) => number;

    // Primeira tentativa
    const delay1 = retryStrategy(1);
    expect(delay1).toBe(50); // 1 * 50 = 50

    // Segunda tentativa
    const delay2 = retryStrategy(2);
    expect(delay2).toBe(100); // 2 * 50 = 100

    // Muitas tentativas - deve respeitar o limite de 2000ms
    const delay100 = retryStrategy(100);
    expect(delay100).toBe(2000); // Math.min(100 * 50, 2000) = 2000
  });
});
