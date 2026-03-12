
/**
 * Schema de validação para query de busca
 */
export const searchQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      q: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Termo de busca',
      },
      uf: {
        type: 'string',
        pattern: '^[A-Z]{2}$',
        description: 'Estado (2 letras maiúsculas)',
      },
      cidade: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Nome da cidade',
      },
      page: {
        type: 'integer',
        minimum: 1,
        default: 1,
        description: 'Número da página',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Itens por página',
      },
    },
  },
};

/**
 * Schema de resposta de busca
 */
export const searchResponseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            produto: { type: 'string' },
            item: { type: 'string' },
            unidade: { type: 'string' },
            uf: { type: 'string' },
            cidade: { type: 'string' },
            valor_minimo: { type: 'number' },
            valor_medio: { type: 'number' },
            valor_maximo: { type: 'number' },
            caminho_referencia: { type: ['string', 'null'] },
            data_extracao: { type: 'string', format: 'date-time' },
            relevancia: { type: 'number' },
          },
        },
      },
      pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      filters: {
        type: 'object',
        properties: {
          searchTerm: { type: ['string', 'null'] },
          uf: { type: ['string', 'null'] },
          cidade: { type: ['string', 'null'] },
        },
      },
    },
  },
  400: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      error: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          timestamp: { type: 'string' },
          path: { type: 'string' },
        },
      },
    },
  },
};

/**
 * Schema de resposta de status da fila
 */
export const queueStatusSchema = {
  200: {
    type: 'object',
    properties: {
      queue: { type: 'string' },
      counts: {
        type: 'object',
        properties: {
          waiting: { type: 'integer' },
          active: { type: 'integer' },
          completed: { type: 'integer' },
          failed: { type: 'integer' },
          delayed: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      timestamp: { type: 'string' },
    },
  },
};

/**
 * Schema de resposta de enqueue
 */
export const enqueueResponseSchema = {
  200: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
      jobId: { type: ['string', 'number'] },
      data: { type: 'object' },
    },
  },
};
