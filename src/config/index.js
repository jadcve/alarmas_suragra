// src/config/index.js
import 'dotenv/config';

function need(key, def) {
  const v = process.env[key] ?? def;
  if (v === undefined || v === null || v === '') {
    throw new Error(`❌ Missing required env var: ${key}`);
  }
  return v;
}

function bool(key, def = 'true') {
  return String(process.env[key] ?? def).toLowerCase() === 'true';
}

function list(key) {
  const v = process.env[key] ?? '';
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

const dbSource = (process.env.DB_SOURCE || 'MSSQL').toUpperCase();
const usingHana = dbSource === 'HANA';

// 🎯 MSSQL: expone **ambos** nombres (server/database y host/db) para compatibilidad
const mssql = (() => {
  const server = process.env.MSSQL_SERVER || process.env.MSSQL_HOST;
  const database = process.env.MSSQL_DATABASE || process.env.MSSQL_DB;
  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD || process.env.MSSQL_PASS;
  const port = process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433;

  // Validaciones claras (si usas MSSQL)
  if (dbSource === 'MSSQL') {
    need('MSSQL_SERVER or MSSQL_HOST', server);
    need('MSSQL_DATABASE or MSSQL_DB', database);
    need('MSSQL_USER', user);
    need('MSSQL_PASSWORD or MSSQL_PASS', password);
  }

  return {
    // “nuevo/tedious”
    server,
    database,
    user,
    password,
    port,
    options: {
      encrypt: bool('MSSQL_ENCRYPT', 'true'),
      trustServerCertificate: bool('MSSQL_TRUST_CERT', 'true'),
      // instanceName: process.env.MSSQL_INSTANCE || undefined, // usa esto si manejas instancia nombrada SIN puerto
    },
    pool: {
      max: process.env.MSSQL_POOL_MAX ? Number(process.env.MSSQL_POOL_MAX) : 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    // “legado/antiguo” (por si algún módulo viejo lo espera)
    host: server,
    db: database,
    pass: password,
  };
})();

// HANA solo se valida si se usa
const hana = {
  host: usingHana ? need('HANA_HOST') : process.env.HANA_HOST,
  port: Number(process.env.HANA_PORT ?? 30015),
  user: usingHana ? need('HANA_USER') : process.env.HANA_USER,
  pass: usingHana ? need('HANA_PASS') : process.env.HANA_PASS,
  ssl: bool('HANA_SSL', 'false'),
};

export const cfg = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  tz: process.env.TZ ?? 'America/Santiago',

  dbSource, // 'MSSQL' o 'HANA'
  mssql,
  hana,

  ses: {
    region: need('AWS_REGION', 'us-east-1'),
    from: process.env.SES_FROM || 'Cobranza Suragra <no-reply@suragra.com>',
    cc: list('SES_CC'),
    bcc: list('SES_BCC'),
    testRecipients: list('SES_TEST_RECIPIENTS'),
  },

  altTest: Number(process.env.ALT_TEST ?? 1),
  dryRun: bool('DRY_RUN', 'false'),
  fallbackRecipient: process.env.FALLBACK_RECIPIENT || null,
};
