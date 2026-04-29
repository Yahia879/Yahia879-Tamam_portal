import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [columns] = await connection.execute("DESCRIBE disbursement_requests");
console.log("أعمدة جدول طلبات الصرف:");
columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));

const [orderColumns] = await connection.execute("DESCRIBE disbursement_orders");
console.log("\nأعمدة جدول أوامر الصرف:");
orderColumns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));

await connection.end();
