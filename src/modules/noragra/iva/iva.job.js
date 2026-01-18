// src/modules/noragra/iva/iva.job.js
import 'dotenv/config';
import { cfg } from '../../../config/index.js';
import { runIVA } from './iva.service.js';
import { logger } from '../../../logging/logger.js';

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'UnhandledRejection en Job IVA NORAGRA');
  process.exitCode = 1;
});

(async () => {
  try {
    logger.info({
      mssqlCfg: {
        server: cfg.mssql.server,
        database: cfg.mssql.database,
        user: cfg.mssql.user,
        port: cfg.mssql.port
      }
    }, 'CFG MSSQL efectiva (NORAGRA IVA)');

    await runIVA();
    logger.info('Job IVA NORAGRA finalizado.');
  } catch (err) {
    logger.error({ err }, 'Job IVA NORAGRA falló');
    process.exitCode = 1;
  }
})();
