// TODO: Cambiar a tu vista/procedure real en HANA
const VIEW = `"Suragra"."V_ALARMAS_ADEUDOS"`;
export async function findDebtors(db, { fechaCorte, minimo = 10 }) {
  const sql = `SELECT DISTINCT "CardCode" AS COD_IDT_SAP, "CardName" AS NOM_CLT_SAP
               FROM ${VIEW} WHERE "DocDate" <= ? AND COALESCE("VatPending",0) >= ?`;
  const rows = await db.query(sql, [fechaCorte, minimo]);
  return rows.map(r=>({ code:r.COD_IDT_SAP, name:r.NOM_CLT_SAP }));
}
