import fs from "fs";
import crypto from "crypto";

const filePath = "./drizzle/0057_sparkling_moon_knight.sql";
const content = fs.readFileSync(filePath, "utf8");

// Try standard SHA256 hash of file content
const sha256 = crypto.createHash("sha256").update(content).digest("hex");
console.log("SHA256 of 0057 content:", sha256);

// Try SHA256 of file content with unix line endings
const unixContent = content.replace(/\r\n/g, "\n");
const sha256Unix = crypto.createHash("sha256").update(unixContent).digest("hex");
console.log("SHA256 of 0057 unix content:", sha256Unix);

// Try SHA256 of the migration filename
const sha256Filename = crypto.createHash("sha256").update("0057_sparkling_moon_knight.sql").digest("hex");
console.log("SHA256 of filename:", sha256Filename);
