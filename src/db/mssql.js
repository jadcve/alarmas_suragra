// src/db/mssql.js
import sql from 'mssql';

let poolPromise;

export function createMssqlPool(cfg) {
  const server   = cfg.server ?? cfg.host;
  const database = cfg.database ?? cfg.db ?? cfg.dbName;
  const user     = cfg.user ?? cfg.username;
  const password = cfg.password ?? cfg.pass;
  const port     = cfg.port ?? cfg.mssqlPort ?? 1433;

  if (!server || typeof server !== 'string') {
    const safe = { ...cfg };
    if (safe.password) safe.password = '****';
    if (safe.pass)     safe.pass     = '****';
    console.error('createMssqlPool: configuración MSSQL inválida', {
      server: safe.server ?? safe.host ?? null,
      database: safe.database ?? safe.db ?? safe.dbName ?? null,
      user: safe.user ?? safe.username ?? null,
      port: safe.port ?? safe.mssqlPort ?? null
    });
    throw new Error('createMssqlPool: no se encontró server/host en la configuración MSSQL');
  }
  if (!database) throw new Error('createMssqlPool: database/db/dbName es requerido');
  if (!user)     throw new Error('createMssqlPool: user/username es requerido');
  if (!password) throw new Error('createMssqlPool: password/pass es requerido');

  if (!poolPromise) {
    console.info('[MSSQL] Conectando…', { server, database, port, options: { encrypt: true, trustServerCertificate: true } });
    poolPromise = sql.connect({
      user,
      password,
      server,
      database,
      port,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        // instanceName: 'SQLEXPRESS', // si usas instancia nombrada y NO defines port
      },
      pool: cfg.pool ?? { max: 10, min: 0, idleTimeoutMillis: 30000 }
    });
  }
  return poolPromise;
}

export { sql };
