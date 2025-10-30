import fs from 'node:fs/promises';
import sql from 'mssql';
import 'dotenv/config';

const cfg = {
  server: process.env.MSSQL_HOST,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASS,
  database: process.env.MSSQL_DB,
  options: { encrypt: true, trustServerCertificate: true },
};

const CODES = ['RFAC','NMOR','IMOR']; // Resumen, Neto, IVA

async function main() {
  const pool = await new sql.ConnectionPool(cfg).connect();
  const q = `
    SELECT COD_CNP, GLS_ALT, GLS_DET_ALT
    FROM TA_SGRA_ALRTA_FLUJO_CNTBL
    WHERE COD_CNP IN ('RFAC','NMOR','IMOR') AND (COD_EST_REG=1 OR COD_EST_REG IS NULL)
    ORDER BY COD_IDT_ALT DESC
  `;
  const rs = await pool.request().query(q);

  await fs.mkdir('src/templates', { recursive: true });
  const subjects = {};
  const seen = new Set();

  for (const r of rs.recordset) {
    const code = r.COD_CNP?.trim();
    if (!CODES.includes(code) || seen.has(code)) continue; // toma el más reciente
    seen.add(code);

    const cleanHtml = String(r.GLS_DET_ALT ?? '').replace(/¶¶/g, ''); // si quieres saltos: '<p>&nbsp;</p>'
    await fs.writeFile(`src/templates/${code}.html`, cleanHtml, 'utf8');
    subjects[code] = String(r.GLS_ALT ?? '').trim();
  }

  await fs.writeFile('src/templates/subjects.json', JSON.stringify(subjects, null, 2), 'utf8');
  await pool.close();
  console.log('✅ Templates exportadas a src/templates/*.html y subjects.json');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
