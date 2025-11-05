// src/db/mssql.js
import sql from 'mssql';

let poolPromise;

export function createMssqlPool(cfg) {
  if (!poolPromise) {
    poolPromise = sql.connect({
      user: cfg.user,
      password: cfg.password,
      server: cfg.server,
      database: cfg.database,
      port: cfg.port ?? 1433,
      options: {
        encrypt: true,
        trustServerCertificate: true
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
    });
  }
  return poolPromise; // Promise<ConnectionPool>
}

export { sql }; // por si quieres reusar tipos desde aquí
