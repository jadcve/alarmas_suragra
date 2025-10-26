import 'dotenv/config';
function need(k){const v=process.env[k]; if(!v) throw new Error(`Missing env ${k}`); return v;}
export const cfg = {
  dbSource: process.env.DB_SOURCE ?? 'HANA',
  tz: process.env.TZ ?? 'America/Santiago',
  hana: {
    host: need('HANA_HOST'),
    port: Number(process.env.HANA_PORT ?? 30015),
    user: need('HANA_USER'),
    pass: need('HANA_PASS'),
    ssl: process.env.HANA_SSL === 'true'
  },
  mssql: {
    host: process.env.MSSQL_HOST,
    db: process.env.MSSQL_DB,
    user: process.env.MSSQL_USER,
    pass: process.env.MSSQL_PASS
  },
  ses: { region: need('AWS_REGION'), from: need('SES_FROM') },
  testRecipients: (process.env.TEST_RECIPIENTS ?? '').split(',').map(s=>s.trim()).filter(Boolean)
};
