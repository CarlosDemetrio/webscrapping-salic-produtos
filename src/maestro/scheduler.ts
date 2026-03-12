import cron from 'node-cron';
import { enfileirarTodosProdutos } from './maestro';

export function agendarScrapingDiario(): cron.ScheduledTask {
  const task = cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Iniciando scraping agendado');
    console.log(`Data/Hora: ${new Date().toISOString()}`);

    try {
      await enfileirarTodosProdutos('cron-diario');
      console.log('[CRON] Scraping agendado iniciado com sucesso');
    } catch (error) {
      console.error('[CRON] Erro ao iniciar scraping agendado:', error);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  console.log('Agendamento configurado: Scraping diario as 02:00 (horario de Brasilia)');

  return task;
}

export function pararAgendamento(task: cron.ScheduledTask): void {
  task.stop();
  console.log('Agendamento parado');
}
