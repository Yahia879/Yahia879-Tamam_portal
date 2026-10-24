import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.beginTransaction();
  await connection.query("SELECT id FROM fund_lock WHERE id = 1 FOR UPDATE");
  const [rows] = await connection.query(
    "SELECT id, requestNumber, attachmentsJson FROM disbursement_requests WHERE requestNumber LIKE 'DR-%' OR (fundRestrictionType IS NOT NULL AND requestNumber LIKE 'FDR-%') ORDER BY id FOR UPDATE"
  );
  const sequences = new Map();
  for (const row of rows) {
    const match = /^DR-(\d{4})-(\d+)$/.exec(row.requestNumber);
    if (match) sequences.set(match[1], Math.max(sequences.get(match[1]) || 0, Number(match[2])));
  }
  const changes = [];
  for (const row of rows) {
    const match = /^FDR-(\d{4})-/.exec(row.requestNumber);
    if (!match) continue;
    const year = match[1];
    const sequence = (sequences.get(year) || 0) + 1;
    const requestNumber = `DR-${year}-${String(sequence).padStart(4, "0")}`;
    const attachments = row.attachmentsJson ? JSON.parse(row.attachmentsJson) : [];
    if (!Array.isArray(attachments)) throw new Error(`Invalid attachments for request ${row.id}`);
    attachments.push({ name: "legacy_request_number", url: row.requestNumber, type: "metadata" });
    await connection.execute(
      "UPDATE disbursement_requests SET requestNumber = ?, attachmentsJson = ? WHERE id = ? AND requestNumber = ?",
      [requestNumber, JSON.stringify(attachments), row.id, row.requestNumber]
    );
    sequences.set(year, sequence);
    changes.push({ id: row.id, previousNumber: row.requestNumber, requestNumber });
  }
  await connection.commit();
  console.log(JSON.stringify(changes, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
