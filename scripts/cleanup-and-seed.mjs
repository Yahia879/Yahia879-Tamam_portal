import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
await connection.execute("TRUNCATE TABLE request_history");
await connection.execute("TRUNCATE TABLE mosque_requests");
await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
console.log("تم حذف الطلبات السابقة");
await connection.end();
