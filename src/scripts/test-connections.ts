import { orchestrator } from '../services/orchestrator';
import { logger } from '../utils/logger';

async function main() {
  logger.info('🔍 Running Araadhya Fashion Multi-Platform Diagnostics...\n');
  const results = await orchestrator.runFullDiagnostics();

  console.log('\n===============================================================');
  console.log('       ARAADHYA FASHION INTEGRATION DIAGNOSTICS REPORT');
  console.log('===============================================================');

  for (const [platform, status] of Object.entries(results.platforms) as any) {
    const icon = status.success ? '✅' : '⚠️ ';
    console.log(`${icon} [${platform.toUpperCase()}]: ${status.message}`);
  }

  console.log('===============================================================\n');
  process.exit(0);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
