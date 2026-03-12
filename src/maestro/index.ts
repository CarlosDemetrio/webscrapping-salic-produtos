import { agendarScrapingDiario } from './scheduler';

console.log('MAESTRO - Sistema de agendamento');

const cronTask = agendarScrapingDiario();

console.log('Maestro ativo e aguardando horario de execucao');
console.log('Para disparar manualmente: POST /api/scraper/trigger');

process.on('SIGINT', () => {
  console.log('Encerrando Maestro...');
  cronTask.stop();
  console.log('Maestro encerrado com sucesso');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Encerrando Maestro...');
  cronTask.stop();
  console.log('Maestro encerrado com sucesso');
  process.exit(0);
});

export { cronTask };
