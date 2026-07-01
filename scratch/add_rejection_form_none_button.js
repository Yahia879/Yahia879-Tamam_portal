import fs from "fs";

const filepath = "C:/Users/Loq/Desktop/Trying/Tamam_portal/client/src/pages/RequesterApprovalDetails.tsx";
let content = fs.readFileSync(filepath, "utf8");

const target = `                          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full">
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("text")}
                              className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                                notesRequiredType === "text"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }\`}
                            >
                              رد كتابي (نصي)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("file")}
                              className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                                notesRequiredType === "file"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }\`}
                            >
                              مرفق ملف/صورة (PDF، صور)
                            </button>
                          </div>`;

const replacement = `                          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full">
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("text")}
                              className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                                notesRequiredType === "text"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }\`}
                            >
                              رد كتابي (نصي)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("file")}
                              className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                                notesRequiredType === "file"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }\`}
                            >
                              مرفق ملف/صورة (PDF، صور)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotesRequiredType("none")}
                              className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${
                                notesRequiredType === "none"
                                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-350 shadow-sm border border-rose-200/20"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              }\`}
                            >
                              رفض نهائي (لا يتطلب رد)
                            </button>
                          </div>`;

content = content.replace(/\r\n/g, "\n");

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filepath, content, "utf8");
  console.log("✅ Rejection form none option successfully added.");
} else {
  console.log("❌ Target segment not found in file.");
}
