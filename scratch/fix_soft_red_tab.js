import fs from "fs";

const filepath = "C:/Users/Loq/Desktop/Trying/Tamam_portal/client/src/pages/RequesterApprovalDetails.tsx";
let content = fs.readFileSync(filepath, "utf8");

const target = '"bg-slate-900 dark:bg-slate-700 text-white shadow-sm"';
const replacement = '"bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"';

if (content.includes(target)) {
  content = content.replaceAll(target, replacement);
  fs.writeFileSync(filepath, content, "utf8");
  console.log("✅ Active tab color in rejection form successfully changed to soft rose-red.");
} else {
  console.log("❌ Target string not found.");
}
