import mysql from "mysql2/promise";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Trying to drop corrupted table 'brand_settings'...");
    
    // Method 1: Drop table if exists
    try {
      await connection.execute("DROP TABLE IF EXISTS `brand_settings` CASCADE");
      console.log("[Success] Table dropped using standard DROP statement.");
    } catch (e1: any) {
      console.log(`[Method 1 Failed] standard DROP failed: ${e1.message}`);
      
      // Method 2: Discard tablespace then drop
      try {
        console.log("Trying Method 2 (Discard tablespace)...");
        await connection.execute("ALTER TABLE `brand_settings` DISCARD TABLESPACE");
        await connection.execute("DROP TABLE `brand_settings`");
        console.log("[Success] Table dropped using DISCARD TABLESPACE method.");
      } catch (e2: any) {
        console.log(`[Method 2 Failed] DISCARD TABLESPACE failed: ${e2.message}`);
        
        // Method 3: Try to drop it simply by turning off foreign key checks
        try {
          console.log("Trying Method 3 (Disable foreign key checks)...");
          await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
          await connection.execute("DROP TABLE IF EXISTS `brand_settings`");
          await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
          console.log("[Success] Table dropped with FOREIGN_KEY_CHECKS disabled.");
        } catch (e3: any) {
          console.log(`[Method 3 Failed] ${e3.message}`);
          console.log("\n[Manual Fix Required] If all methods failed, you may need to:");
          console.log("1. Go to your MySQL data directory (usually C:\\ProgramData\\MySQL\\MySQL Server X.Y\\Data\\temam\\).");
          console.log("2. Create an empty file named 'brand_settings.ibd'.");
          console.log("3. Run: DROP TABLE brand_settings; again.");
        }
      }
    }
    
    await connection.end();
  } catch (err: any) {
    console.error("Connection error:", err.message);
  }
}

main();
