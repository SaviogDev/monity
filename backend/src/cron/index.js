import cron from 'node-cron';
import { processPendingRules } from '../services/recurringRuleService.js';

export const startCronJobs = () => {
  cron.schedule('1 0 * * *', async () => {
    console.log('\n=========================================');
    console.log(`[CRON] 🕒 Iniciando rotina automática de recorrências: ${new Date().toISOString()}`);
    
    try {
      const results = await processPendingRules();
      
      console.log(`[CRON] ✅ Sucesso!`);
      console.log(`[CRON] 🔄 Regras avaliadas/atualizadas: ${results.processedRules}`);
      console.log(`[CRON] 💰 Transações injetadas no extrato: ${results.transactionsCreated}`);
      if (results.errors > 0) {
        console.warn(`[CRON] ⚠️ Alerta: Tivemos ${results.errors} erro(s) durante o processamento.`);
      }
    } catch (error) {
      console.error('[CRON] ❌ Erro fatal ao rodar rotina de recorrências:', error);
    }
    
    console.log('=========================================\n');
  });

  console.log('[CRON] ⏰ Rotinas de automação agendadas com sucesso.');
};