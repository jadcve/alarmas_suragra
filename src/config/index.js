// src/config/index.js
import 'dotenv/config';

function need(key, val) {
  if (val === undefined || val === null || String(val) === '') {
    throw new Error(`❌ Missing required env var: ${key}`);
  }
  return val;
}

function needEither(k1, k2, v1, v2) {
  const v = v1 ?? v2;
  if (v === undefined || v === null || String(v) === '') {
    throw new Error(`❌ Missing required env var: ${k1} or ${k2}`);
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

// —— MSSQL ——
const mssql_server   = process.env.MSSQL_SERVER || process.env.MSSQL_HOST;
const mssql_database = needEither('MSSQL_DATABASE','MSSQL_DB', process.env.MSSQL_DATABASE, process.env.MSSQL_DB);
const mssql_user     = need('MSSQL_USER', process.env.MSSQL_USER);
const mssql_password = needEither('MSSQL_PASSWORD','MSSQL_PASS', process.env.MSSQL_PASSWORD, process.env.MSSQL_PASS);
const mssql_port     = process.env.MSSQL_PORT ? Number(process.env.MSSQL_PORT) : 1433;
const mssql_requestTimeout = process.env.MSSQL_REQUEST_TIMEOUT
  ? Number(process.env.MSSQL_REQUEST_TIMEOUT)
  : 600000;
const mssql_connectionTimeout = process.env.MSSQL_CONNECTION_TIMEOUT
  ? Number(process.env.MSSQL_CONNECTION_TIMEOUT)
  : 30000;

export const cfg = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  tz: process.env.TZ ?? 'America/Santiago',

  dbSource,

  mssql: {
    server: mssql_server,          // acepta SERVER u HOST
    database: mssql_database,      // acepta DATABASE o DB
    user: mssql_user,
    password: mssql_password,      // acepta PASSWORD o PASS
    port: mssql_port,
    connectionTimeout: mssql_connectionTimeout,
    requestTimeout: mssql_requestTimeout,
    options: {
      encrypt: bool('MSSQL_ENCRYPT', 'true'),
      trustServerCertificate: bool('MSSQL_TRUST_CERT', 'true'),
      requestTimeout: mssql_requestTimeout,
      // instanceName: process.env.MSSQL_INSTANCE || undefined, // si usas instancia nombrada
    },
    pool: {
      max: process.env.MSSQL_POOL_MAX ? Number(process.env.MSSQL_POOL_MAX) : 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  },

  hana: {
    host: usingHana ? need('HANA_HOST', process.env.HANA_HOST) : process.env.HANA_HOST,
    port: Number(process.env.HANA_PORT ?? 30015),
    user: usingHana ? need('HANA_USER', process.env.HANA_USER) : process.env.HANA_USER,
    pass: usingHana ? need('HANA_PASS', process.env.HANA_PASS) : process.env.HANA_PASS,
    ssl: bool('HANA_SSL', 'false'),
  },

  ses: {
    region: need('AWS_REGION', process.env.AWS_REGION),
    from: process.env.SES_FROM || 'Cobranza Suragra <no-reply@suragra.com>',
    cc: list('SES_CC'),
    bcc: list('SES_BCC'),
    testCc: list('SES_TEST_CC'),
    testRecipients: list('SES_TEST_RECIPIENTS'),
  },

  altTest: Number(process.env.ALT_TEST ?? 1),
  dryRun: bool('DRY_RUN', 'false'),
  fallbackRecipient: process.env.FALLBACK_RECIPIENT || null,

};
