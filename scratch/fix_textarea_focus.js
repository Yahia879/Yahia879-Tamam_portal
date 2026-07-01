import fs from "fs";

const filepath = "C:/Users/Loq/Desktop/Trying/Tamam_portal/client/src/pages/RequesterApprovalDetails.tsx";
let content = fs.readFileSync(filepath, "utf8");

const target = "focus:ring-rose-500 focus:border-rose-500";
const replacement = "focus:ring-rose-300/60 focus:border-rose-300";

if (content.includes(target)) {
  content = content.replaceAll(target, replacement);
  fs.writeFileSync(filepath, content, "utf8");
  console.log("✅ Rejection textarea focus colors successfully softened.");
} else {
  console.log("❌ Target focus string not found.");
}
