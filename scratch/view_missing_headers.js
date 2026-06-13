import fs from "fs";
import path from "path";

const PAGES_DIR = "C:/Users/Yamen/Documents/GitHub/Yahia879-Tamam_portal/client/src/pages";

const files = [
  "BOQ.tsx",
  "Branding.tsx",
  "OrganizationSettings.tsx",
  "ProgramCustomization.tsx",
  "StageSettings.tsx",
  "NotificationCustomization.tsx",
  "ActionSettings.tsx",
  "MosquesMap.tsx",
  "Profile.tsx",
  "Settings.tsx"
];

for (const file of files) {
  const filePath = path.join(PAGES_DIR, file);
  if (!fs.existsSync(filePath)) continue;
  
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  
  console.log(`\n===========================================`);
  console.log(`File: ${file}`);
  console.log(`===========================================`);
  
  // Find where return ( starts
  let foundReturn = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("return (") || line.includes("return  (") || (line.includes("return") && line.includes("<"))) {
      foundReturn = true;
      const start = i;
      const end = Math.min(lines.length - 1, i + 35);
      for (let j = start; j <= end; j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
      break;
    }
  }
}
