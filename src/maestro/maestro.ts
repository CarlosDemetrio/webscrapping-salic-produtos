import scraperQueue from '../queue/scraperQueue';
import { PRODUTOS } from '../scraper/data/produtos.data';

export async function enfileirarTodosProdutos(batchId: string) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const jobsEnfileirados = [];

  try {
    for (const produto of PRODUTOS) {
      const job = await scraperQueue.add(
        `scrape-produto-${produto.id}`,
        {
          produtoId: produto.id,
          produtoNome: produto.nome,
        },
        {
          jobId: `${batchId}-produto-${produto.id}-${timestamp}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        }
      );

      jobsEnfileirados.push({
        jobId: job.id,
        produtoId: produto.id,
        produtoNome: produto.nome,
      });
    }

    const tempoDecorrido = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      success: true,
      batchId,
      timestamp,
      totalProdutos: PRODUTOS.length,
      jobsEnfileirados,
      tempoSegundos: parseFloat(tempoDecorrido),
    };

  } catch (error) {
    throw error;
  }
}

export async function obterStatusBatch(batchId: string) {
  try {
    const [completed, active, waiting, failed] = await Promise.all([
      scraperQueue.getCompleted(0, 100),
      scraperQueue.getActive(0, 100),
      scraperQueue.getWaiting(0, 100),
      scraperQueue.getFailed(0, 100),
    ]);

    const filterByBatch = (jobs: any[]) =>
      jobs.filter(job => job.id?.startsWith(batchId));

    const batchCompleted = filterByBatch(completed);
    const batchActive = filterByBatch(active);
    const batchWaiting = filterByBatch(waiting);
    const batchFailed = filterByBatch(failed);

    const total = PRODUTOS.length;
    const processados = batchCompleted.length;
    const emProcessamento = batchActive.length;
    const aguardando = batchWaiting.length;
    const falhados = batchFailed.length;
    const progresso = total > 0 ? ((processados / total) * 100).toFixed(2) : '0.00';

    return {
      batchId,
      status: {
        total,
        processados,
        emProcessamento,
        aguardando,
        falhados,
        progresso: `${progresso}%`,
      },
      jobs: {
        completed: batchCompleted.map(j => ({ id: j.id, name: j.name })),
        active: batchActive.map(j => ({ id: j.id, name: j.name })),
        waiting: batchWaiting.map(j => ({ id: j.id, name: j.name })),
        failed: batchFailed.map(j => ({ id: j.id, name: j.name, failedReason: j.failedReason })),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw error;
  }
}

export async function limparJobsAntigos() {
  try {
    await scraperQueue.clean(24 * 3600 * 1000, 100, 'completed');
    await scraperQueue.clean(7 * 24 * 3600 * 1000, 200, 'failed');

    return {
      success: true,
      message: 'Jobs antigos removidos',
    };
  } catch (error) {
    throw error;
  }
}
