// src/db/factory.js
import { cfg } from '../config/index.js';
import { createHanaConnection } from './hana.js';
import { createMssqlPool } from './mssql.js';
import { logger } from '../logging/logger.js';

let connectionPromise; // cache en forma de PROMESA

export async function getDb() {
  if (!connectionPromise) {
    logger.info(`Inicializando conexión ${cfg.dbSource}...`);
    connectionPromise = cfg.dbSource === 'MSSQL'
      ? createMssqlPool(cfg.mssql)   // Promise<ConnectionPool>
      : createHanaConnection(cfg.hana); // ajusta si HANA también es async
  }
  return connectionPromise; // await donde lo uses
}
