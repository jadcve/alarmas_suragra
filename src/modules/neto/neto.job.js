// src/modules/neto/neto.job.js
import 'dotenv/config';
import { cfg } from '../../config/index.js';
import { runNeto } from './neto.service.js';
import { logger } from '../../logging/logger.js';

(async () => {
  try {
    logger.info({ mssqlCfg: {
      server: cfg.mssql.server,
      database: cfg.mssql.database,
      user: cfg.mssql.user,
      port: cfg.mssql.port
    }}, 'CFG MSSQL efectiva');

    await runNeto();
    logger.info('Job NETO finalizado.');
  } catch (err) {
    logger.error({ err }, 'Job NETO falló');
    process.exitCode = 1;
  }
})();
