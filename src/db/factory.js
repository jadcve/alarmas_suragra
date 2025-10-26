import { cfg } from '../config/index.js';
import { createHanaConnection } from './hana.js';
import { createMssqlPool } from './mssql.js';
export function getDb(){ return cfg.dbSource === 'MSSQL' ? createMssqlPool(cfg.mssql) : createHanaConnection(cfg.hana); }
