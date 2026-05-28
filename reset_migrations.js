import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  console.log("🚀 Starting migrations cleanup and consolidation...");

  const drizzleDir = path.resolve("./drizzle");
  const backupDir = path.resolve("./drizzle_backup_collision");

  if (!fs.existsSync(drizzleDir)) {
    console.error("❌ Error: 'drizzle' directory not found.");
    return;
  }

  // 1. Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
    console.log(`Created backup directory: ${backupDir}`);
  }

  // 2. Move all files except schema.ts and relations.ts to backup
  const files = fs.readdirSync(drizzleDir);
  for (const file of files) {
    if (file === "schema.ts" || file === "relations.ts") {
      continue; // Keep the core schema files
    }

    const oldPath = path.join(drizzleDir, file);
    const newPath = path.join(backupDir, file);

    fs.renameSync(oldPath, newPath);
    console.log(`Moved to backup: ${file}`);
  }

  console.log("✨ Drizzle directory cleaned. Only schema.ts and relations.ts remain.");

  // 3. Run drizzle-kit generate to create a fresh, consolidated initial migration
  console.log("Running 'npx drizzle-kit generate'...");
  try {
    const output = execSync("npx drizzle-kit generate", { encoding: "utf8" });
    console.log("✅ Drizzle Generate Output:\n", output);
  } catch (error) {
    console.error("❌ Error running drizzle-kit generate:", error.message);
  }
}

main().catch(console.error);
