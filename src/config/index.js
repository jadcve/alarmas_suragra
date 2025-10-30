import 'dotenv/config';

function need(k) {
  const v = process.env[k];
  if (!v) throw new Error(`❌ Missing required env var: ${k}`);
  return v;
}

export const cfg = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  tz: process.env.TZ ?? 'America/Santiago',

  dbSource: process.env.DB_SOURCE ?? 'HANA', // 'MSSQL' o 'HANA'

  hana: {
    host: need('HANA_HOST'),
    port: Number(process.env.HANA_PORT ?? 30015),
    user: need('HANA_USER'),
    pass: need('HANA_PASS'),
    ssl: process.env.HANA_SSL === 'true'
  },

  mssql: {
    host: need('MSSQL_HOST'),
    db: need('MSSQL_DB'),
    user: need('MSSQL_USER'),
    pass: need('MSSQL_PASS'),
    // puedes usar este bloque directamente para sql.connect(cfg.mssql)
    options: {
      encrypt: true,
      trustServerCertificate: true
    },
    pool: {
      max: Number(process.env.MSSQL_POOL_MAX ?? 10),
      min: 1,
      idleTimeoutMillis: 30000
    }
  },

  ses: {
    region: need('AWS_REGION'),
    from: process.env.SES_FROM || 'Cobranza Suragra <no-reply@suragra.com>'
  },

  testRecipients: (process.env.TEST_RECIPIENTS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  dryRun: process.env.DRY_RUN === 'true'
};
