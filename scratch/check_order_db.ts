import mysql from "mysql2/promise";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/test_temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Connected to test_temam database.");
    
    const [rows]: any = await connection.execute(
      "SELECT * FROM `disbursement_orders` WHERE `orderNumber` = 'DO-2026-0002'"
    );
    
    console.log("Disbursement Order DO-2026-0002:");
    console.log(JSON.stringify(rows[0], null, 2));
    
    await connection.end();
  } catch (err: any) {
    console.error("Error fetching order:", err.message);
  }
}

main();
