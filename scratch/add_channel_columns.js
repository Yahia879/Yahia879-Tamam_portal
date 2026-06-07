import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL database!");

  const tables = ["users", "roles"];
  const columns = [
    "receiveBeneficiaryEmail",
    "receiveRequestEmail",
    "receiveFinancialEmail",
    "receiveBeneficiaryWhatsapp",
    "receiveRequestWhatsapp",
    "receiveFinancialWhatsapp",
    "receiveBeneficiarySms",
    "receiveRequestSms",
    "receiveFinancialSms"
  ];

  for (const table of tables) {
    for (const column of columns) {
      try {
        await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} TINYINT(1) DEFAULT 0;`);
        console.log(`Column ${column} added to ${table} successfully!`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${column} already exists in ${table}.`);
        } else {
          console.error(`Error adding ${column} to ${table}:`, error);
        }
      }
    }
  }

  await connection.end();
  console.log("Done!");
}

main().catch(console.error);
