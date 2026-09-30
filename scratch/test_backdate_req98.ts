import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT id, programData FROM mosque_requests WHERE id = 98');
  if (rows.length === 0) {
    console.error('Request 98 not found!');
    process.exit(1);
  }

  let pData = rows[0].programData;
  if (typeof pData === 'string') {
    try { pData = JSON.parse(pData); } catch (e) {}
  }
  pData = pData || {};

  const sedanaExec = pData.sedanaExecution || {};
  const inwardOrders = sedanaExec.inwardOrders || [];

  console.log(`Found ${inwardOrders.length} inward orders`);
  
  // Set date to 35 days ago (e.g. 2026-08-19)
  const backdateStr = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  const backdateShort = backdateStr.split('T')[0];

  inwardOrders.forEach((o: any, idx: number) => {
    console.log(`Order ${idx}: ${o.orderNumber}, was ${o.createdAt || o.orderDate}`);
    o.createdAt = backdateStr;
    o.orderDate = backdateShort;
  });

  pData.sedanaExecution.inwardOrders = inwardOrders;

  // Also backdate requestStageTracking startedAt for execution stage if present
  try {
    await conn.query(
      `UPDATE request_stage_tracking SET startedAt = ? WHERE requestId = 98 AND stageCode = 'execution'`,
      [new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)]
    );
    console.log('Stage tracking updated');
  } catch (e) {
    console.log('Stage tracking update skipped or error:', e);
  }

  await conn.query(
    'UPDATE mosque_requests SET programData = ? WHERE id = 98',
    [JSON.stringify(pData)]
  );

  console.log(`Updated request 98 inward orders to backdate: ${backdateStr}`);
  await conn.end();
}

main().catch(console.error);
