// src/modules/suragra/resumen/resumen.job.js
import 'dotenv/config';
import { cfg } from '../../../config/index.js';
import { runRFAC } from './resumen.service.js';
import { logger } from '../../../logging/logger.js';

(async () => {
  try {
    logger.info({
      mssqlCfg: {
        server: cfg.mssql.server,
        database: cfg.mssql.database,
        user: cfg.mssql.user,
        port: cfg.mssql.port
      }
    }, 'CFG MSSQL efectiva');

    await runRFAC();
    logger.info('Job RFAC finalizado.');
  } catch (err) {
    logger.error({ err }, 'Job RFAC falló');
    process.exitCode = 1;
  }
})();
