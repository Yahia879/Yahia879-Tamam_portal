import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection('mysql://root:@localhost:3306/test_temam');
  console.log('Connected to DB');

  // 1. Check foreign key references
  const [fks] = await conn.query(`
    SELECT TABLE_NAME, COLUMN_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE REFERENCED_TABLE_SCHEMA = 'test_temam' 
      AND REFERENCED_TABLE_NAME = 'quotations'
  `);
  console.log('FK references to quotations:', fks);

  // 2. Check if request 83 has selectedQuotationId
  const [reqRows] = await conn.query('SELECT id, selectedQuotationId, programData FROM mosque_requests WHERE id = 83');
  console.log('Request 83 selectedQuotationId:', reqRows[0]?.selectedQuotationId);

  // 3. Clear selectedQuotationId and awardedItemVendors on request 83 if needed
  if (reqRows.length > 0) {
    let pData = reqRows[0].programData;
    if (typeof pData === 'string') {
      try { pData = JSON.parse(pData); } catch {}
    }
    if (pData && pData.awardedItemVendors) {
      delete pData.awardedItemVendors;
      delete pData.actualMosqueCost;
      delete pData.baseCost;
    }
    await conn.query('UPDATE mosque_requests SET selectedQuotationId = NULL, programData = ?, approvedBudget = NULL WHERE id = 83', [JSON.stringify(pData)]);
    console.log('Cleared request 83 selectedQuotationId and programData awarded vendors');
  }

  // 4. Reset unitPrice and totalPrice in quantity_schedules for request 83
  await conn.query('UPDATE quantity_schedules SET unitPrice = "0.00", totalPrice = "0.00" WHERE requestId = 83');
  console.log('Reset quantity_schedules prices for request 83');

  // 5. Delete all quotations for request 83
  const [delResult] = await conn.query('DELETE FROM quotations WHERE requestId = 83');
  console.log(`Deleted ${delResult.affectedRows} quotations for request 83`);

  // 6. Verify remaining quotations for request 83
  const [remaining] = await conn.query('SELECT id, quotationNumber FROM quotations WHERE requestId = 83');
  console.log('Remaining quotations for request 83:', remaining.length);

  await conn.end();
}

main().catch(console.error);
