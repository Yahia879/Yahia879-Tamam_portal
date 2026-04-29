import mysql from "mysql2/promise";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [requests] = await connection.execute("SELECT * FROM disbursement_requests");
console.log("طلبات الصرف:", requests.length);
console.log(requests);

const [orders] = await connection.execute("SELECT * FROM disbursement_orders");
console.log("\nأوامر الصرف:", orders.length);
console.log(orders);

await connection.end();
