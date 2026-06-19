import mysql from "mysql2/promise";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/test_temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Connected to test_temam database.");
    console.log("Trying to drop corrupted table 'projects'...");
    
    // Disable foreign key checks
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
    
    // Method 1: Drop table if exists
    try {
      await connection.execute("DROP TABLE IF EXISTS `projects` CASCADE");
      console.log("[Success] Table 'projects' dropped using standard DROP statement.");
    } catch (e1: any) {
      console.log(`[Method 1 Failed] standard DROP failed: ${e1.message}`);
      
      // Method 2: Discard tablespace then drop
      try {
        console.log("Trying Method 2 (Discard tablespace)...");
        await connection.execute("ALTER TABLE `projects` DISCARD TABLESPACE");
        await connection.execute("DROP TABLE `projects`");
        console.log("[Success] Table dropped using DISCARD TABLESPACE method.");
      } catch (e2: any) {
        console.log(`[Method 2 Failed] DISCARD TABLESPACE failed: ${e2.message}`);
        
        // Method 3: Try to drop it with simpler drop
        try {
          console.log("Trying Method 3 (Simple Drop)...");
          await connection.execute("DROP TABLE `projects`");
          console.log("[Success] Table dropped using simple DROP.");
        } catch (e3: any) {
          console.log(`[Method 3 Failed] ${e3.message}`);
          console.log("\n[Manual Fix Required] If all methods failed, you may need to:");
          console.log("1. Go to your MySQL data directory (usually C:\\ProgramData\\MySQL\\MySQL Server X.Y\\Data\\test_temam\\).");
          console.log("2. Create an empty file named 'projects.ibd'.");
          console.log("3. Run: DROP TABLE projects; again.");
        }
      }
    }
    
    // Re-enable foreign key checks
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
    await connection.end();
  } catch (err: any) {
    console.error("Connection error:", err.message);
  }
}

main();
