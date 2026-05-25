import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  try {
    console.log("Dropping old constraint payments_contractId_contracts_id_fk...");
    await connection.execute("ALTER TABLE payments DROP FOREIGN KEY payments_contractId_contracts_id_fk;");
    console.log("Old constraint dropped successfully!");
  } catch (error) {
    console.log("Could not drop constraint (maybe already dropped?):", error.message);
  }

  try {
    console.log("Adding new constraint payments_contractId_contracts_enhanced_id_fk...");
    await connection.execute("ALTER TABLE payments ADD CONSTRAINT payments_contractId_contracts_enhanced_id_fk FOREIGN KEY (contractId) REFERENCES contracts_enhanced (id) ON DELETE NO ACTION ON UPDATE NO ACTION;");
    console.log("New constraint added successfully pointing to contracts_enhanced!");
  } catch (error) {
    console.error("Error adding new constraint:", error);
  }

  await connection.end();
}

main().catch(console.error);
