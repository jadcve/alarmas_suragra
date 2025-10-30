// neto.service.js (extracto con retoques sutiles)
export async function runNeto({ db, fechaCorte, recipients }) {
  moment.locale('es');

  const { template, subject } = await getTemplate(db);

  for await (const camp of getCampanias(db)) {
    if (String(camp.COD_CNP).trim() !== 'NMOR') continue;

    for await (const contacto of getClientes(db)) {
      const { contactos, count } = await getContactos(db, contacto.COD_IDT_SAP);
      if (!count || !contactos?.length) {
        await insertLog(db, { codIdtSap: contacto.COD_IDT_SAP, codCtc: 0, codigo: 3, error: 'NO EXISTEN CONTACTOS PARA NOTIFICAR' });
        continue;
      }

      for (const ctc of contactos) {
        if (String(ctc.GLS_EML).trim().toUpperCase() === 'NO DEFINIDO') {
          await insertLog(db, { codIdtSap: contacto.COD_IDT_SAP, codCtc: ctc.COD_CTC, codigo: 2, error: 'EMAIL NO DEFINIDO' });
          continue;
        }

        const recordsets = await getRegistros(db, contacto.COD_IDT_SAP);

        // ===== armar HTML =====
        let temp = String(template ?? '');
        temp = temp.replace("&lt;&lt;CLIENTE&gt;&gt;", `<b>${(contacto.NOM_CLT_SAP ?? '').toString().trim()}</b>`);
        temp = temp.replace("&lt;&lt;MES&gt;&gt;", `<b>${moment().subtract(10, 'days').format('MMMM').replace(/^\w/, c => c.toUpperCase())} ${moment().format('YYYY')}</b>`);

        let detalleUSD = '', detalleCLP = '';
        let totalUSD = 0, totalCLP = 0, contUSD = 0, contCLP = 0;

        for (const set of (recordsets ?? [])) {
          for (const row of (set ?? [])) {
            const tipo = row.FLG_TPO_REG;
            const mon  = row.COD_MON;
            const tot  = Number(row.IMP_TOT_PEN ?? 0);
            const saldoEmail = Number(row.IMP_SDO_PEN_EML ?? tot);

            if (tipo === 'NP' && mon === 'USD') {
              contUSD++; totalUSD += tot;
              detalleUSD += fila({ ...row, MONTO_MOSTRAR: saldoEmail }, true);
            }
            if (tipo === 'NP' && mon === 'CLP') {
              contCLP++; totalCLP += tot;
              detalleCLP += fila({ ...row, MONTO_MOSTRAR: tot }, false);
            }
          }
        }

        const bloqueUSD = tabla(
          'Facturacion Moneda Extranjera',
          detalleUSD,
          contUSD
            ? `Total: USD ${formatNumber(totalUSD, { fractionDigits: 2, symbols: { decimal: ',', grouping: '.' } })}`
            : 'No existen documentos con NETO pendiente asociados a facturas con moneda extranjera'
        );

        const bloqueCLP = tabla(
          'Facturacion Moneda Local',
          detalleCLP,
          contCLP
            ? `Total: CLP ${formatNumber(totalCLP, { fractionDigits: 0, symbols: { decimal: '.', grouping: '.' } })}`
            : 'No existen documentos con NETO pendiente asociados a facturas con moneda local'
        );

        temp = temp.replace('&lt;FACTURAS&gt;', bloqueUSD + bloqueCLP);
        temp = temp.replace('&lt;TOTALUSD&gt;', formatNumber(totalUSD, { fractionDigits: 2, symbols: { decimal: ',', grouping: '.' } }));
        temp = temp.replace('&lt;TOTALCLP&gt;', formatNumber(totalCLP, { fractionDigits: 0, symbols: { decimal: '.', grouping: '.' } }));

        const to = buildRecipients(ctc.GLS_EML, recipients);

        if (process.env.DRY_RUN === 'true') {
          logger.info({ to, preview: true }, 'NETO (dry-run) listo');
        } else {
          try {
            await sendEmail({ subject: `${subject} SURAGRA`, htmlBody: temp, to });
            await insertLog(db, { codIdtSap: contacto.COD_IDT_SAP, codCtc: ctc.COD_CTC, codigo: 0, error: 'EJECUTADO EXITOSAMENTE' });
          } catch (e) {
            logger.error(e, 'Fallo envío SES');
            await insertLog(db, { codIdtSap: contacto.COD_IDT_SAP, codCtc: ctc.COD_CTC, codigo: 1, error: e?.message ?? e });
          }
        }
      }
    }
  }

  return { subject: 'NETO', ok: true };
}
