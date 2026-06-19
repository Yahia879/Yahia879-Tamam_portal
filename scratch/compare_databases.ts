import mysql from "mysql2/promise";

interface ColumnInfo {
  Field: string;
  Type: string;
  Null: string;
  Key: string;
  Default: any;
  Extra: string;
}

async function getTablesAndColumns(connection: mysql.Connection, dbName: string) {
  // Use database
  await connection.query(`USE \`${dbName}\``);
  
  // Show tables
  const [tablesResult]: any = await connection.query("SHOW TABLES");
  const tables = tablesResult.map((row: any) => Object.values(row)[0] as string);
  
  const dbSchema: Record<string, Record<string, ColumnInfo>> = {};
  const corruptedTables: string[] = [];
  
  for (const table of tables) {
    try {
      const [columns]: any = await connection.query(`DESCRIBE \`${table}\``);
      dbSchema[table] = {};
      for (const col of columns) {
        dbSchema[table][col.Field] = col;
      }
    } catch (err: any) {
      console.warn(`[Warning] Could not describe table '${dbName}.${table}': ${err.message}`);
      corruptedTables.push(table);
    }
  }
  
  return { tables, schema: dbSchema, corruptedTables };
}

async function main() {
  const connectionString = "mysql://root:@localhost:3306";
  try {
    const conn1 = await mysql.createConnection(connectionString);
    const conn2 = await mysql.createConnection(connectionString);
    
    console.log("Connecting to temam and test_temam...");
    
    // Check if test_temam exists
    const [databases]: any = await conn1.query("SHOW DATABASES");
    const dbNames = databases.map((row: any) => Object.values(row)[0] as string);
    
    const hasTemam = dbNames.includes("temam");
    const hasTestTemam = dbNames.includes("test_temam");
    
    if (!hasTemam) {
      console.error("Database 'temam' does not exist!");
      process.exit(1);
    }
    if (!hasTestTemam) {
      console.error("Database 'test_temam' does not exist!");
      process.exit(1);
    }
    
    const db1 = await getTablesAndColumns(conn1, "temam");
    const db2 = await getTablesAndColumns(conn2, "test_temam");
    
    console.log("\n================ COMPARE RESULTS ================\n");
    
    // Compare Corrupted Tables
    if (db1.corruptedTables.length > 0) {
      console.log(`### Corrupted Tables (Cannot describe / doesn't exist in engine) in 'temam':`);
      db1.corruptedTables.forEach(t => console.log(`- ${t}`));
      console.log("");
    }
    if (db2.corruptedTables.length > 0) {
      console.log(`### Corrupted Tables (Cannot describe / doesn't exist in engine) in 'test_temam':`);
      db2.corruptedTables.forEach(t => console.log(`- ${t}`));
      console.log("");
    }

    // 1. Compare Tables
    const tablesInTemamOnly = db1.tables.filter(t => !db2.tables.includes(t));
    const tablesInTestTemamOnly = db2.tables.filter(t => !db1.tables.includes(t));
    const commonTables = db1.tables.filter(t => db2.tables.includes(t));
    
    if (tablesInTemamOnly.length > 0) {
      console.log(`### Tables in 'temam' but missing in 'test_temam':`);
      tablesInTemamOnly.forEach(t => console.log(`- ${t}`));
      console.log("");
    } else {
      console.log(`- No tables are only in 'temam'.`);
    }
    
    if (tablesInTestTemamOnly.length > 0) {
      console.log(`### Tables in 'test_temam' but missing in 'temam':`);
      tablesInTestTemamOnly.forEach(t => console.log(`- ${t}`));
      console.log("");
    } else {
      console.log(`- No tables are only in 'test_temam'.`);
    }
    
    // 2. Compare Columns of Common Tables (excluding corrupted ones)
    let columnsDiffFound = false;
    console.log("### Column Differences in Common Tables:");
    
    for (const table of commonTables) {
      // Skip if corrupted in either db
      if (db1.corruptedTables.includes(table) || db2.corruptedTables.includes(table)) {
        continue;
      }
      
      const cols1 = db1.schema[table];
      const cols2 = db2.schema[table];
      
      const colsInTemamOnly = Object.keys(cols1).filter(c => !cols2[c]);
      const colsInTestTemamOnly = Object.keys(cols2).filter(c => !cols1[c]);
      
      const commonCols = Object.keys(cols1).filter(c => cols2[c]);
      const modifiedCols: string[] = [];
      
      for (const col of commonCols) {
        const c1 = cols1[col];
        const c2 = cols2[col];
        
        if (c1.Type !== c2.Type || c1.Null !== c2.Null || c1.Default !== c2.Default) {
          modifiedCols.push(col);
        }
      }
      
      if (colsInTemamOnly.length > 0 || colsInTestTemamOnly.length > 0 || modifiedCols.length > 0) {
        columnsDiffFound = true;
        console.log(`\n* Table: **${table}**`);
        
        colsInTemamOnly.forEach(col => {
          console.log(`  - Column [${col}] exists in 'temam' but is missing in 'test_temam'`);
        });
        
        colsInTestTemamOnly.forEach(col => {
          console.log(`  - Column [${col}] exists in 'test_temam' but is missing in 'temam'`);
        });
        
        modifiedCols.forEach(col => {
          const c1 = cols1[col];
          const c2 = cols2[col];
          console.log(`  - Column [${col}] has different settings:`);
          console.log(`    * 'temam': Type=${c1.Type}, Null=${c1.Null}, Default=${c1.Default}`);
          console.log(`    * 'test_temam': Type=${c2.Type}, Null=${c2.Null}, Default=${c2.Default}`);
        });
      }
    }
    
    if (!columnsDiffFound) {
      console.log("- No column differences found in common tables.");
    }
    
    await conn1.end();
    await conn2.end();
  } catch (err: any) {
    console.error("Comparison error:", err.message);
  }
}

main();
