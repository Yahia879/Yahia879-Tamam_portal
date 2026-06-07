import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/temam");
  console.log("Connected to MySQL!");

  const [usersRows] = await connection.execute(`
    SELECT id, name, email, role, receiveBeneficiaryNotifications, receiveBeneficiaryEmail
    FROM users
    WHERE role != 'service_requester' AND deletedAt IS NULL
  `);

  console.log("\n--- Users Settings ---");
  console.table(usersRows);

  const [rolesRows] = await connection.execute(`
    SELECT id, name_ar, receiveBeneficiaryNotifications, receiveBeneficiaryEmail
    FROM roles
  `);

  console.log("\n--- Roles Settings ---");
  console.table(rolesRows);

  await connection.end();
}

main().catch(console.error);
