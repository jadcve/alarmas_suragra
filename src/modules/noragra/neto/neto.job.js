// src/modules/noragra/neto/neto.job.js
import 'dotenv/config';
import { cfg } from '../../../config/index.js';
import { runNeto } from './neto.service.js';
import { logger } from '../../../logging/logger.js';

(async () => {
  try {
    logger.info({ mssqlCfg: {
      server: cfg.mssql.server,
      database: cfg.mssql.database,
      user: cfg.mssql.user,
      port: cfg.mssql.port
    }}, 'CFG MSSQL efectiva (NORAGRA NETO)');

    await runNeto();
    logger.info('Job NETO NORAGRA finalizado.');
  } catch (err) {
    logger.error({ err }, 'Job NETO NORAGRA falló');
    process.exitCode = 1;
  }
})();
