import 'dotenv/config';
import sql from 'mssql';
import { cfg } from '../src/config/index.js';

const linkedServer = process.env.HANA_LINKED_SERVER || 'HANA_SGR_LINK';

async function query(pool, text) {
  return pool.request().query(text);
}

function printResult(label, ok, extra = '') {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}${extra ? ` -> ${extra}` : ''}`);
}

async function run() {
  const pool = await sql.connect(cfg.mssql);
  try {
    console.log('MSSQL conectado:', cfg.mssql.server, cfg.mssql.database);

    try {
      const r = await query(pool, `SELECT name FROM sys.servers WHERE name = '${linkedServer}'`);
      printResult(`Linked server ${linkedServer} existe`, (r.recordset || []).length > 0);
      if (!(r.recordset || []).length) {
        console.log('No existe linked server; no se puede continuar con auto-fix.');
        process.exitCode = 2;
        return;
      }
    } catch (e) {
      printResult('Validar existencia linked server', false, e.message);
    }

    const options = [
      ['data access', 'true'],
      ['rpc', 'true'],
      ['rpc out', 'true'],
      ['use remote collation', 'true'],
      ['collation compatible', 'false'],
      ['connect timeout', '30'],
      ['query timeout', '600']
    ];

    for (const [opt, val] of options) {
      try {
        await query(
          pool,
          `EXEC master.dbo.sp_serveroption @server='${linkedServer}', @optname='${opt}', @optvalue='${val}'`
        );
        printResult(`sp_serveroption ${opt}=${val}`, true);
      } catch (e) {
        printResult(`sp_serveroption ${opt}=${val}`, false, e.message);
      }
    }

    try {
      await query(pool, `EXEC master.dbo.sp_testlinkedserver @servername='${linkedServer}'`);
      printResult('sp_testlinkedserver', true);
    } catch (e) {
      printResult('sp_testlinkedserver', false, e.message);
    }

    const checks = [
      {
        label: 'OPENQUERY SURAGRA.OINV',
        sql: `SELECT TOP 1 * FROM OPENQUERY([${linkedServer}], 'SELECT "DocEntry" FROM "SURAGRA"."OINV" LIMIT 1')`
      },
      {
        label: 'OPENQUERY NORAGRA.OINV',
        sql: `SELECT TOP 1 * FROM OPENQUERY([${linkedServer}], 'SELECT "DocEntry" FROM "NORAGRA"."OINV" LIMIT 1')`
      }
    ];

    for (const c of checks) {
      try {
        const r = await query(pool, c.sql);
        printResult(c.label, true, `rows=${r.recordset?.length ?? 0}`);
      } catch (e) {
        printResult(c.label, false, e.message);
      }
    }
  } finally {
    await pool.close();
  }
}

run().catch((e) => {
  console.error('Fallo script fix-linked-hana:', e.message);
  process.exitCode = 1;
});
